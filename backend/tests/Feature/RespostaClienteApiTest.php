<?php

namespace Tests\Feature;

use App\Models\OrdemServico;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * O cliente aprova ou recusa o orçamento pela tela de acompanhamento, sem login, com o código do link do WhatsApp (RF12).
 */
class RespostaClienteApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Tecnico $tecnico;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = Tecnico::create([
            'nome' => 'Técnico Teste',
            'nome_assistencia' => 'Assistência Teste',
            'email' => 'teste-resposta-cliente@reparos.test',
            'password' => 'senha123',
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * Abre a OS e, pela API do técnico, leva até o orçamento enviado. Devolve a OS e o código do link.
     *
     * @return array{OrdemServico, string}
     */
    private function osAguardandoAprovacao(): array
    {
        Sanctum::actingAs($this->tecnico);

        $os = $this->tecnico->clientes()
            ->create(['nome' => 'Ana Souza', 'telefone_whatsapp' => '119'.random_int(10000000, 99999999), 'endereco' => 'Rua A, 1'])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15'])
            ->ordensServico()
            ->create(['problema_relatado' => 'Não liga']);

        $base = "/api/ordens-servico/{$os->id}";
        $this->postJson("{$base}/retirada")->assertOk();
        $this->postJson("{$base}/diagnostico", ['diagnostico' => 'Fonte queimada'])->assertOk();
        $this->putJson("{$base}/orcamento", [
            'prazo_dias' => 3,
            'itens' => [
                ['tipo' => 'peca', 'descricao' => 'Fonte 65W', 'quantidade' => 1, 'valor_unitario' => 150],
                ['tipo' => 'servico', 'descricao' => 'Troca da fonte', 'quantidade' => 1, 'valor_unitario' => 1200],
            ],
        ])->assertCreated();
        $this->postJson("{$base}/orcamento/envio")->assertOk();

        // Daqui em diante, o cliente, sem login.
        $this->app['auth']->forgetGuards();

        return [$os, $os->orcamento()->first()->codigo_resposta];
    }

    private function responder(OrdemServico $os, array $dados)
    {
        return $this->postJson("/api/acompanhar/{$os->numero}/orcamento/resposta", $dados);
    }

    public function test_tela_publica_mostra_itens_e_prazo_sem_o_codigo(): void
    {
        [$os, $codigo] = $this->osAguardandoAprovacao();

        $resposta = $this->getJson("/api/acompanhar/{$os->numero}")
            ->assertOk()
            ->assertJsonPath('orcamento.vencido', false)
            ->assertJsonPath('orcamento.prazo_dias', 3)
            ->assertJsonPath('orcamento.itens.*.descricao', ['Fonte 65W', 'Troca da fonte']);

        $this->assertStringNotContainsString($codigo, $resposta->getContent());
    }

    public function test_cliente_aprova_pelo_link_e_a_os_vai_para_em_reparo(): void
    {
        Carbon::setTestNow('2026-11-13 10:00'); // sexta-feira
        [$os, $codigo] = $this->osAguardandoAprovacao();

        $this->responder($os, ['codigo' => $codigo, 'aprovado' => true])
            ->assertOk()
            ->assertJsonPath('status', 'em_reparo')
            ->assertJsonPath('orcamento.situacao', 'aprovado')
            ->assertJsonPath('orcamento.prazo_entrega', '2026-11-18')
            ->assertJsonMissingPath('orcamento.codigo_resposta');

        $orcamento = $os->orcamento()->first();
        $this->assertSame('link', $orcamento->canal_resposta);
        $this->assertNotNull($orcamento->data_resposta);
        $this->assertNull($orcamento->codigo_resposta);

        $ultimo = $os->historico()->reorder('id', 'desc')->first();
        $this->assertSame('aguardando_aprovacao', $ultimo->status_anterior->value);
        $this->assertSame('em_reparo', $ultimo->status_novo->value);
        $this->assertSame('Orçamento aprovado pelo próprio cliente na tela de acompanhamento (link enviado pelo WhatsApp).', $ultimo->observacao);
    }

    public function test_cliente_recusa_pelo_link(): void
    {
        [$os, $codigo] = $this->osAguardandoAprovacao();

        $this->responder($os, ['codigo' => $codigo, 'aprovado' => false])
            ->assertOk()
            ->assertJsonPath('status', 'orcamento_recusado')
            ->assertJsonPath('orcamento.situacao', 'recusado')
            ->assertJsonPath('orcamento.prazo_entrega', null);

        $this->assertStringContainsString('recusado pelo próprio cliente', $os->historico()->reorder('id', 'desc')->first()->observacao);
    }

    public function test_sem_codigo_ou_com_codigo_errado_nao_responde(): void
    {
        [$os, $codigo] = $this->osAguardandoAprovacao();

        $this->responder($os, ['aprovado' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['codigo' => 'Use o link enviado pela assistência para responder ao orçamento.']);

        $this->responder($os, ['codigo' => strrev($codigo), 'aprovado' => true])
            ->assertForbidden()
            ->assertJsonPath('message', 'Este link não permite responder ao orçamento. Use o último link enviado pela assistência.');

        $this->assertSame('aguardando_aprovacao', $os->refresh()->status->value);
    }

    public function test_link_vale_uma_resposta_so(): void
    {
        [$os, $codigo] = $this->osAguardandoAprovacao();

        $this->responder($os, ['codigo' => $codigo, 'aprovado' => true])->assertOk();
        $this->responder($os, ['codigo' => $codigo, 'aprovado' => false])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Esta OS não está aguardando a resposta do orçamento.');

        $this->assertSame('em_reparo', $os->refresh()->status->value);
    }

    public function test_orcamento_vencido_pode_ser_recusado_mas_nao_aprovado(): void
    {
        Carbon::setTestNow('2026-11-02 09:00');
        [$os, $codigo] = $this->osAguardandoAprovacao();
        Carbon::setTestNow('2026-11-20 09:00');

        $this->getJson("/api/acompanhar/{$os->numero}")->assertJsonPath('orcamento.vencido', true);

        $this->responder($os, ['codigo' => $codigo, 'aprovado' => true])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Este orçamento venceu em 12/11/2026. Fale com a assistência para confirmar os valores.');

        $this->responder($os, ['codigo' => $codigo, 'aprovado' => false])
            ->assertOk()
            ->assertJsonPath('status', 'orcamento_recusado');
    }

    public function test_os_inexistente_responde_404(): void
    {
        $this->responder(new OrdemServico(['numero' => 'OS-00000000-XXXXX']), ['codigo' => 'x', 'aprovado' => true])
            ->assertNotFound();
    }

    public function test_limite_de_tentativas_por_minuto(): void
    {
        [$os] = $this->osAguardandoAprovacao();

        for ($i = 0; $i < 10; $i++) {
            $this->responder($os, ['codigo' => 'chute-'.$i, 'aprovado' => true])->assertForbidden();
        }

        $this->responder($os, ['codigo' => 'chute-10', 'aprovado' => true])
            ->assertStatus(429)
            ->assertJsonPath('message', fn (string $m) => str_starts_with($m, 'Muitas tentativas de resposta ao orçamento.'));
    }
}
