<?php

namespace Tests\Feature;

use App\Enums\StatusOrdemServico;
use App\Models\OrdemServico;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Reparo, OS pronta, entrega (com e sem reparo) e consulta do histórico (RF13 a RF17, RF25).
 */
class ReparoEntregaApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Tecnico $tecnico;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = $this->criarTecnico('teste-reparo@reparos.test');
        Sanctum::actingAs($this->tecnico);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function criarTecnico(string $email): Tecnico
    {
        return Tecnico::create([
            'nome' => 'Técnico Teste',
            'nome_assistencia' => 'Assistência Teste',
            'email' => $email,
            'password' => 'senha123',
        ]);
    }

    private function criarOs(?Tecnico $tecnico = null): OrdemServico
    {
        // Telefone diferente a cada cliente: o mesmo técnico não cadastra dois clientes com o mesmo número.
        return ($tecnico ?? $this->tecnico)->clientes()
            ->create(['nome' => 'Ana Souza', 'telefone_whatsapp' => '119'.random_int(10000000, 99999999), 'endereco' => 'Rua A, 1'])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15'])
            ->ordensServico()
            ->create(['problema_relatado' => 'Não liga']);
    }

    /**
     * Leva a OS pelas etapas anteriores, usando a própria API, até a resposta do cliente.
     */
    private function osRespondida(bool $aprovado = true): OrdemServico
    {
        $os = $this->criarOs();
        $base = "/api/ordens-servico/{$os->id}";

        $this->postJson("{$base}/retirada")->assertOk();
        $this->postJson("{$base}/diagnostico", ['diagnostico' => 'Fonte queimada'])->assertOk();
        $this->putJson("{$base}/orcamento", [
            'prazo_dias' => 3,
            'itens' => [['tipo' => 'peca', 'descricao' => 'Fonte 65W', 'quantidade' => 1, 'valor_unitario' => 150]],
        ])->assertCreated();
        $this->postJson("{$base}/orcamento/envio")->assertOk();
        $this->postJson("{$base}/orcamento/resposta", ['aprovado' => $aprovado, 'canal' => 'whatsapp'])->assertOk();

        return $os->refresh();
    }

    private function url(OrdemServico $os, string $etapa): string
    {
        return "/api/ordens-servico/{$os->id}/{$etapa}";
    }

    public function test_fluxo_completo_de_aberta_ate_entregue(): void
    {
        $os = $this->osRespondida();
        $this->assertSame(StatusOrdemServico::EmReparo, $os->status);

        $this->putJson($this->url($os, 'reparo'), [
            'servico_executado' => '  Troca da fonte e limpeza interna ',
            'pecas_trocadas' => 'Fonte 65W (nova)',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'em_reparo')
            ->assertJsonPath('servico_executado', 'Troca da fonte e limpeza interna')
            ->assertJsonPath('pecas_trocadas', 'Fonte 65W (nova)');

        $this->postJson($this->url($os, 'pronto'))
            ->assertOk()
            ->assertJsonPath('status', 'pronto_para_retirada')
            ->assertJsonPath('historico.6.observacao', 'Reparo concluído');

        Carbon::setTestNow(now()->addMinute());
        $this->postJson($this->url($os, 'entrega'), ['observacao' => 'Entregue à própria cliente, com carregador'])
            ->assertOk()
            ->assertJsonPath('status', 'entregue')
            ->assertJsonPath('historico.7.status_anterior', 'pronto_para_retirada')
            ->assertJsonPath('historico.7.status_novo', 'entregue')
            ->assertJsonPath('historico.7.observacao', 'Entregue à própria cliente, com carregador');

        $os->refresh();
        $this->assertSame(now()->toDateTimeString(), $os->data_entrega->toDateTimeString());

        // Cada passo do fluxo ficou no histórico, na ordem em que aconteceu.
        $this->assertSame([
            'aberta',
            'aguardando_diagnostico',
            'diagnostico_realizado',
            'orcamento_enviado',
            'aguardando_aprovacao',
            'em_reparo',
            'pronto_para_retirada',
            'entregue',
        ], $os->historico->pluck('status_novo')->map->value->all());
    }

    public function test_recusa_leva_a_devolucao_sem_reparo(): void
    {
        $os = $this->osRespondida(aprovado: false);

        // Sem reparo, não há serviço a registrar nem OS pronta.
        $this->putJson($this->url($os, 'reparo'), ['servico_executado' => 'Nada'])->assertUnprocessable();
        $this->postJson($this->url($os, 'pronto'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS está em "Orçamento recusado" e não pode ir para "Pronto para retirada".');

        $this->postJson($this->url($os, 'entrega'))
            ->assertOk()
            ->assertJsonPath('status', 'entregue')
            ->assertJsonPath('servico_executado', null)
            ->assertJsonPath('historico.6.status_anterior', 'orcamento_recusado')
            ->assertJsonPath('historico.6.observacao', 'Equipamento devolvido sem reparo');

        $this->assertNotNull($os->refresh()->data_entrega);
    }

    public function test_nao_marca_pronta_sem_servico_executado(): void
    {
        $os = $this->osRespondida();

        $this->postJson($this->url($os, 'pronto'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Registre o serviço executado antes de marcar a OS como pronta.');

        $this->assertSame(StatusOrdemServico::EmReparo, $os->refresh()->status);
    }

    public function test_corrige_anotacoes_do_reparo_sem_mudar_status_e_trava_depois_de_pronta(): void
    {
        $os = $this->osRespondida();

        $this->putJson($this->url($os, 'reparo'), ['servico_executado' => 'Troca da fonte'])->assertOk();
        $this->putJson($this->url($os, 'reparo'), ['servico_executado' => 'Troca da fonte e do cooler', 'pecas_trocadas' => 'Fonte, cooler'])
            ->assertOk()
            ->assertJsonPath('servico_executado', 'Troca da fonte e do cooler')
            ->assertJsonCount(6, 'historico');

        $this->postJson($this->url($os, 'pronto'))->assertOk();

        $this->putJson($this->url($os, 'reparo'), ['servico_executado' => 'Outro'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'O serviço executado só pode ser registrado enquanto a OS está em reparo.');
        $this->assertSame('Troca da fonte e do cooler', $os->refresh()->servico_executado);
    }

    public function test_valida_reparo_e_entrega(): void
    {
        $os = $this->osRespondida();

        $this->putJson($this->url($os, 'reparo'), ['servico_executado' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['servico_executado' => 'Descreva o serviço executado.']);

        $this->putJson($this->url($os, 'reparo'), ['servico_executado' => 'Troca da fonte'])->assertOk();
        $this->postJson($this->url($os, 'pronto'))->assertOk();

        $this->postJson($this->url($os, 'entrega'), ['data_entrega' => now()->addDay()->toDateTimeString()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['data_entrega' => 'A entrega não pode estar no futuro.']);
        $this->assertSame(StatusOrdemServico::ProntoParaRetirada, $os->refresh()->status);
    }

    public function test_nao_pula_etapas_no_fim_do_fluxo(): void
    {
        $nova = $this->criarOs();

        $this->postJson($this->url($nova, 'pronto'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS está em "Aberta" e não pode ir para "Pronto para retirada".');
        $this->postJson($this->url($nova, 'entrega'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS está em "Aberta" e não pode ir para "Entregue".');

        // Em reparo ainda não pode ser entregue: precisa ficar pronta antes.
        $os = $this->osRespondida();
        $this->postJson($this->url($os, 'entrega'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS está em "Em reparo" e não pode ir para "Entregue".');

        $this->assertNull($os->refresh()->data_entrega);
        $this->assertNull($nova->refresh()->data_entrega);
        $this->assertCount(1, $nova->historico);
    }

    public function test_os_entregue_fica_encerrada(): void
    {
        $os = $this->osRespondida(aprovado: false);
        $this->postJson($this->url($os, 'entrega'))->assertOk();
        $total = $os->historico()->count();

        $this->postJson($this->url($os, 'entrega'))->assertUnprocessable();
        $this->postJson($this->url($os, 'pronto'))->assertUnprocessable();
        $this->putJson($this->url($os, 'reparo'), ['servico_executado' => 'X'])->assertUnprocessable();
        $this->putJson("/api/ordens-servico/{$os->id}", ['problema_relatado' => 'Outro'])->assertUnprocessable();
        $this->postJson("/api/ordens-servico/{$os->id}/orcamento/resposta", ['aprovado' => true, 'canal' => 'whatsapp'])
            ->assertUnprocessable();

        $this->assertSame(StatusOrdemServico::Entregue, $os->refresh()->status);
        $this->assertSame($total, $os->historico()->count());
    }

    public function test_consulta_historico_em_ordem_cronologica_com_rotulos(): void
    {
        $os = $this->osRespondida();

        $this->getJson($this->url($os, 'historico'))
            ->assertOk()
            ->assertJsonCount(6)
            ->assertJsonPath('0.status_anterior', null)
            ->assertJsonPath('0.status_anterior_rotulo', null)
            ->assertJsonPath('0.status_novo_rotulo', 'Aberta')
            ->assertJsonPath('5.status_anterior_rotulo', 'Aguardando aprovação')
            ->assertJsonPath('5.status_novo_rotulo', 'Em reparo');
    }

    public function test_nao_acessa_etapas_finais_de_os_de_outro_tecnico(): void
    {
        $alheia = $this->criarOs($this->criarTecnico('outro-reparo@reparos.test'));

        $this->putJson($this->url($alheia, 'reparo'), ['servico_executado' => 'X'])->assertNotFound();
        $this->postJson($this->url($alheia, 'pronto'))->assertNotFound();
        $this->postJson($this->url($alheia, 'entrega'))->assertNotFound();
        $this->getJson($this->url($alheia, 'historico'))->assertNotFound();

        $this->assertSame(StatusOrdemServico::Aberta, $alheia->refresh()->status);
    }
}
