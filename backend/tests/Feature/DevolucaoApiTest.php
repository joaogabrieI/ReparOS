<?php

namespace Tests\Feature;

use App\Models\OrdemServico;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Forma de devolução do equipamento: o cliente retira na assistência ou recebe no endereço dele.
 * Vale para a OS pronta e para a devolução sem reparo; aparece no status, no WhatsApp, na tela do cliente,
 * no histórico e no registro de atividade.
 */
class DevolucaoApiTest extends TestCase
{
    use DatabaseTransactions;

    private Usuario $tecnico;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = Usuario::criarComAssistencia([
            'nome' => 'Técnico Teste',
            'nome_assistencia' => 'Assistência Teste',
            'email' => 'teste-devolucao@reparos.test',
            'password' => 'senha123',
        ]);
        Sanctum::actingAs($this->tecnico);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function criarOs(?string $endereco = 'Rua das Flores, 10 - Centro', array $dados = []): OrdemServico
    {
        $equipamento = $this->tecnico->clientes()
            ->create(['nome' => 'Ana Souza', 'telefone_whatsapp' => '119'.random_int(10000000, 99999999), 'endereco' => $endereco])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15']);

        $resposta = $this->postJson('/api/ordens-servico', ['equipamento_id' => $equipamento->id, 'problema_relatado' => 'Não liga', ...$dados])
            ->assertCreated();

        return OrdemServico::findOrFail($resposta->json('id'));
    }

    /**
     * Leva a OS, pela API, até "Em reparo" (aprovado) ou "Orçamento recusado".
     */
    private function avancar(OrdemServico $os, bool $aprovado = true): void
    {
        $base = "/api/ordens-servico/{$os->id}";
        $this->postJson("{$base}/retirada")->assertOk();
        $this->postJson("{$base}/diagnostico", ['diagnostico' => 'Fonte queimada'])->assertOk();
        $this->putJson("{$base}/orcamento", [
            'prazo_dias' => 3,
            'itens' => [['tipo' => 'peca', 'descricao' => 'Fonte 65W', 'quantidade' => 1, 'valor_unitario' => 150]],
        ])->assertCreated();
        $this->postJson("{$base}/orcamento/envio")->assertOk();
        $this->postJson("{$base}/orcamento/resposta", ['aprovado' => $aprovado, 'canal' => 'whatsapp'])->assertOk();
        if ($aprovado) {
            $this->putJson("{$base}/reparo", ['servico_executado' => 'Troca da fonte'])->assertOk();
        }
    }

    public function test_padrao_e_o_cliente_retirar_na_assistencia(): void
    {
        $os = $this->criarOs();

        $this->getJson("/api/ordens-servico/{$os->id}")
            ->assertOk()
            ->assertJsonPath('forma_devolucao', 'retirada')
            ->assertJsonPath('forma_devolucao_rotulo', 'Cliente retira na assistência')
            ->assertJsonPath('endereco_entrega', null)
            ->assertJsonPath('equipamento.cliente.endereco', 'Rua das Flores, 10 - Centro');

        $this->avancar($os);
        $this->postJson("/api/ordens-servico/{$os->id}/pronto")
            ->assertOk()
            ->assertJsonPath('status_rotulo', 'Pronto para retirada')
            ->assertJsonPath('historico.6.status_novo_rotulo', 'Pronto para retirada');
    }

    public function test_marca_pronta_para_entrega_com_endereco_e_data(): void
    {
        $os = $this->criarOs();
        $this->avancar($os);
        $data = now()->addDay()->setTime(14, 30)->toDateTimeString();

        $this->postJson("/api/ordens-servico/{$os->id}/pronto", [
            'forma_devolucao' => 'entrega',
            'endereco_entrega' => '  Av. Brasil, 500 - apto 12 ',
            'entrega_agendada' => $data,
        ])
            ->assertOk()
            ->assertJsonPath('status', 'pronto_para_retirada')
            ->assertJsonPath('status_rotulo', 'Pronto para entrega')
            ->assertJsonPath('forma_devolucao', 'entrega')
            ->assertJsonPath('endereco_entrega', 'Av. Brasil, 500 - apto 12')
            ->assertJsonPath('historico.6.status_novo_rotulo', 'Pronto para entrega')
            ->assertJsonPath('historico.6.observacao', 'Reparo concluído. Equipamento será entregue no endereço do cliente');

        $mensagem = $this->getJson("/api/ordens-servico/{$os->id}/whatsapp")->json('mensagem');
        $this->assertStringContainsString('está pronto e vamos entregá-lo no endereço Av. Brasil, 500 - apto 12.', $mensagem);
        $this->assertStringContainsString('A entrega está combinada para '.Carbon::parse($data)->format('d/m').' às 14:30.', $mensagem);

        // Tela do cliente: mostra que vai receber em casa e a data, sem o endereço.
        $andamento = $this->getJson('/api/acompanhar/'.$os->numero)
            ->assertOk()
            ->assertJsonPath('status_rotulo', 'Pronto para entrega')
            ->assertJsonPath('forma_devolucao', 'entrega')
            ->assertJsonPath('forma_devolucao_rotulo', 'Entrega no endereço do cliente')
            ->assertJsonPath('proximos', ['Entregue'])
            ->json();
        $this->assertNotNull($andamento['entrega_agendada']);
        $this->assertStringNotContainsString('Av. Brasil', json_encode($andamento, JSON_UNESCAPED_UNICODE));

        $this->postJson("/api/ordens-servico/{$os->id}/entrega")
            ->assertOk()
            ->assertJsonPath('status', 'entregue')
            ->assertJsonPath('historico.7.status_anterior_rotulo', 'Pronto para entrega')
            ->assertJsonPath('historico.7.observacao', 'Equipamento entregue no endereço do cliente');
        $this->assertStringContainsString('foi entregue no seu endereço', $this->getJson("/api/ordens-servico/{$os->id}/whatsapp")->json('mensagem'));
    }

    public function test_data_da_entrega_vinda_do_navegador_em_utc_fica_no_horario_de_brasilia(): void
    {
        $os = $this->criarOs();

        // 17:30 em UTC = 14:30 em Brasília.
        $this->putJson("/api/ordens-servico/{$os->id}", ['forma_devolucao' => 'entrega', 'entrega_agendada' => '2030-11-25T17:30:00.000Z'])
            ->assertOk()
            ->assertJsonPath('entrega_agendada', '2030-11-25T17:30:00.000000Z');
        $this->assertSame('2030-11-25 14:30:00', $os->refresh()->getRawOriginal('entrega_agendada'));
    }

    public function test_nao_aceita_retirada_nem_entrega_combinadas_no_passado(): void
    {
        Carbon::setTestNow('2026-11-22 22:35:30');
        $ontem = '2026-11-21 10:00';
        $msgRetirada = 'A retirada combinada não pode ser em uma data que já passou.';
        $msgEntrega = 'A entrega combinada não pode ser em uma data que já passou.';

        $os = $this->criarOs();
        $this->postJson('/api/ordens-servico', ['equipamento_id' => $os->equipamento_id, 'problema_relatado' => 'Tela', 'retirada_agendada' => $ontem])
            ->assertUnprocessable()->assertJsonValidationErrors(['retirada_agendada' => $msgRetirada]);
        $this->putJson("/api/ordens-servico/{$os->id}", ['retirada_agendada' => $ontem])
            ->assertUnprocessable()->assertJsonValidationErrors(['retirada_agendada' => $msgRetirada]);
        $this->putJson("/api/ordens-servico/{$os->id}", ['forma_devolucao' => 'entrega', 'entrega_agendada' => $ontem])
            ->assertUnprocessable()->assertJsonValidationErrors(['entrega_agendada' => $msgEntrega]);

        // O minuto atual ainda vale (a tela não tem segundos).
        $this->putJson("/api/ordens-servico/{$os->id}", ['retirada_agendada' => '2026-11-22 22:35', 'forma_devolucao' => 'entrega', 'entrega_agendada' => '2026-11-23 09:00'])
            ->assertOk();

        // Depois que a data passa, reenviar o mesmo valor (formulário completo) não trava a edição.
        Carbon::setTestNow('2026-11-24 08:00');
        $this->putJson("/api/ordens-servico/{$os->id}", ['problema_relatado' => 'Não liga e esquenta', 'entrega_agendada' => '2026-11-23 09:00'])
            ->assertOk();

        $this->avancar($os);
        $this->postJson("/api/ordens-servico/{$os->id}/pronto", ['forma_devolucao' => 'entrega', 'entrega_agendada' => '2026-11-23 18:00'])
            ->assertUnprocessable()->assertJsonValidationErrors(['entrega_agendada' => $msgEntrega]);
    }

    public function test_entrega_sem_endereco_usa_o_do_cadastro_e_sem_nenhum_e_recusada(): void
    {
        $os = $this->criarOs();
        $this->putJson("/api/ordens-servico/{$os->id}", ['forma_devolucao' => 'entrega'])
            ->assertOk()
            ->assertJsonPath('endereco_entrega', 'Rua das Flores, 10 - Centro');

        $semEndereco = $this->criarOs(null);
        $this->putJson("/api/ordens-servico/{$semEndereco->id}", ['forma_devolucao' => 'entrega'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['endereco_entrega' => 'Informe o endereço de entrega: o cliente não tem endereço no cadastro.']);
        $this->postJson('/api/ordens-servico', [
            'equipamento_id' => $semEndereco->equipamento_id, 'problema_relatado' => 'Tela quebrada', 'forma_devolucao' => 'entrega',
        ])->assertUnprocessable()->assertJsonValidationErrors('endereco_entrega');

        $this->putJson("/api/ordens-servico/{$semEndereco->id}", ['forma_devolucao' => 'entrega', 'endereco_entrega' => 'Rua B, 2'])
            ->assertOk()
            ->assertJsonPath('endereco_entrega', 'Rua B, 2');

        $this->putJson("/api/ordens-servico/{$os->id}", ['forma_devolucao' => 'buscar'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('forma_devolucao');
    }

    public function test_escolhe_na_abertura_e_troca_depois_com_registro_de_atividade(): void
    {
        $os = $this->criarOs(dados: ['forma_devolucao' => 'entrega', 'endereco_entrega' => 'Rua C, 3']);
        $this->assertSame('entrega', $os->forma_devolucao->value);
        $this->assertSame('Rua C, 3', $os->endereco_entrega);

        // Voltar para retirada limpa endereço e data da entrega.
        $this->putJson("/api/ordens-servico/{$os->id}", ['forma_devolucao' => 'retirada', 'motivo' => 'Cliente prefere buscar'])
            ->assertOk()
            ->assertJsonPath('forma_devolucao', 'retirada')
            ->assertJsonPath('endereco_entrega', null)
            ->assertJsonPath('entrega_agendada', null);

        $this->assertDatabaseHas('registros_atividade', [
            'entidade' => 'ordem_servico',
            'entidade_id' => $os->id,
            'acao' => 'alterou',
            'descricao' => "Alterou a OS {$os->numero}. Motivo: Cliente prefere buscar",
        ]);
    }

    public function test_devolucao_sem_reparo_pode_ser_entregue(): void
    {
        $os = $this->criarOs();
        $this->avancar($os, aprovado: false);

        $this->putJson("/api/ordens-servico/{$os->id}", ['forma_devolucao' => 'entrega'])->assertOk();
        $mensagem = $this->getJson("/api/ordens-servico/{$os->id}/whatsapp")->json('mensagem');
        $this->assertStringContainsString('Vamos devolver o aparelho, sem reparo, no endereço Rua das Flores, 10 - Centro.', $mensagem);
        $this->assertStringContainsString('Qual o melhor dia e horário para a entrega?', $mensagem);

        $this->postJson("/api/ordens-servico/{$os->id}/entrega")
            ->assertOk()
            ->assertJsonPath('historico.6.observacao', 'Equipamento devolvido sem reparo, entregue no endereço do cliente');
    }

    public function test_os_entregue_nao_troca_a_forma_de_devolucao(): void
    {
        $os = $this->criarOs();
        $this->avancar($os);
        $this->postJson("/api/ordens-servico/{$os->id}/pronto")->assertOk();
        $this->postJson("/api/ordens-servico/{$os->id}/entrega")->assertOk();

        $this->putJson("/api/ordens-servico/{$os->id}", ['forma_devolucao' => 'entrega'])->assertUnprocessable();
        $this->postJson("/api/ordens-servico/{$os->id}/entrega", ['forma_devolucao' => 'entrega'])->assertUnprocessable();
        $this->assertSame('retirada', $os->refresh()->forma_devolucao->value);
    }

    public function test_pronto_recusado_nao_grava_a_forma_de_devolucao(): void
    {
        $os = $this->criarOs();

        // Ainda "Aberta": não pode ficar pronta, e a escolha enviada junto não é gravada.
        $this->postJson("/api/ordens-servico/{$os->id}/pronto", ['forma_devolucao' => 'entrega'])->assertUnprocessable();
        $this->assertSame('retirada', $os->refresh()->forma_devolucao->value);
    }
}
