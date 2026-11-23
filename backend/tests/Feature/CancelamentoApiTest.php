<?php

namespace Tests\Feature;

use App\Enums\PerfilUsuario;
use App\Enums\SituacaoOrcamento;
use App\Enums\StatusOrdemServico;
use App\Models\OrdemServico;
use App\Models\RegistroAtividade;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Cancelamento da OS (desistência do cliente): motivo obrigatório, só o responsável ou um admin, registro no
 * histórico e no registro de atividade, e devolução sem reparo quando o equipamento já está na assistência.
 */
class CancelamentoApiTest extends TestCase
{
    use DatabaseTransactions;

    private Usuario $admin;

    private Usuario $tecnica;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Usuario::criarComAssistencia([
            'nome' => 'Admin Teste', 'nome_assistencia' => 'Assistência Teste',
            'email' => 'teste-cancela-admin@reparos.test', 'password' => 'Senha@123',
        ]);
        $this->tecnica = $this->admin->assistencia->usuarios()->create([
            'nome' => 'Ana Técnica', 'email' => 'teste-cancela-tec@reparos.test', 'password' => 'Senha@123', 'perfil' => PerfilUsuario::Tecnico,
        ]);
        Sanctum::actingAs($this->admin);
    }

    private function criarOs(): OrdemServico
    {
        return $this->admin->clientes()
            ->create(['nome' => 'Ana Souza', 'telefone_whatsapp' => '119'.random_int(10000000, 99999999), 'endereco' => 'Rua A, 1'])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15'])
            ->ordensServico()
            ->create(['problema_relatado' => 'Não liga']);
    }

    private function url(OrdemServico $os, string $etapa = ''): string
    {
        return "/api/ordens-servico/{$os->id}".($etapa ? "/{$etapa}" : '');
    }

    private function osEm(StatusOrdemServico $alvo): OrdemServico
    {
        $os = $this->criarOs();
        $passos = [
            fn () => $this->postJson($this->url($os, 'retirada')),
            fn () => $this->postJson($this->url($os, 'diagnostico'), ['diagnostico' => 'Fonte queimada']),
            function () use ($os) {
                $this->putJson($this->url($os, 'orcamento'), [
                    'prazo_dias' => 3,
                    'itens' => [['tipo' => 'peca', 'descricao' => 'Fonte 65W', 'quantidade' => 1, 'valor_unitario' => 150]],
                ])->assertCreated();

                return $this->postJson($this->url($os, 'orcamento/envio'));
            },
            fn () => $this->postJson($this->url($os, 'orcamento/resposta'), ['aprovado' => true, 'canal' => 'whatsapp']),
            function () use ($os) {
                $this->putJson($this->url($os, 'reparo'), ['servico_executado' => 'Troca da fonte'])->assertOk();

                return $this->postJson($this->url($os, 'pronto'));
            },
        ];

        foreach ($passos as $passo) {
            if ($os->refresh()->status === $alvo) {
                break;
            }
            $passo()->assertOk();
        }

        return $os->refresh();
    }

    public function test_cancela_com_motivo_e_registra_no_historico_e_na_atividade(): void
    {
        $os = $this->osEm(StatusOrdemServico::AguardandoAprovacao);
        $n = $os->historico()->count();
        $alteracoes = fn () => RegistroAtividade::where('entidade_id', $os->id)->where('entidade', 'ordem_servico')
            ->where('acao', 'alterou')->count();
        $antes = $alteracoes();

        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => ' Cliente desistiu do reparo ', 'status_atual' => 'aguardando_aprovacao'])
            ->assertOk()
            ->assertJsonPath('status', 'cancelada')
            ->assertJsonPath('status_rotulo', 'Cancelada')
            ->assertJsonPath('motivo_cancelamento', 'Cliente desistiu do reparo')
            ->assertJsonPath('devolucao_pendente', true)
            ->assertJsonPath('parada', false)
            ->assertJsonPath('historico.'.$n.'.status_novo', 'cancelada')
            ->assertJsonPath('historico.'.$n.'.observacao', 'Cliente desistiu do reparo')
            ->assertJsonPath('historico.'.$n.'.usuario.id', $this->admin->id);

        $this->assertNotNull($os->refresh()->data_cancelamento);
        $registro = RegistroAtividade::where('entidade', 'ordem_servico')->where('entidade_id', $os->id)
            ->latest('id')->firstOrFail();
        $this->assertSame('cancelou', $registro->acao);
        $this->assertSame($this->admin->id, $registro->usuario_id);
        $this->assertStringContainsString('cancelada em Aguardando aprovação. Motivo: Cliente desistiu do reparo', $registro->descricao);
        $this->assertSame(['status' => 'aguardando_aprovacao'], $registro->dados_anteriores);
        // O motivo e a data não geram um "alterou" separado.
        $this->assertSame($antes, $alteracoes());
    }

    public function test_motivo_e_obrigatorio(): void
    {
        $os = $this->criarOs();

        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => '  '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['motivo' => 'Informe o motivo do cancelamento.']);
        $this->assertSame(StatusOrdemServico::Aberta, $os->refresh()->status);
    }

    public function test_so_o_responsavel_ou_um_admin_cancela(): void
    {
        $os = $this->criarOs();
        Sanctum::actingAs($this->tecnica);

        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu'])->assertForbidden();

        $os->update(['responsavel_id' => $this->tecnica->id]);
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu'])->assertOk();
    }

    public function test_nao_cancela_entregue_recusada_ou_ja_cancelada(): void
    {
        $os = $this->osEm(StatusOrdemServico::ProntoParaRetirada);
        $this->postJson($this->url($os, 'entrega'))->assertOk();
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu'])
            ->assertUnprocessable()->assertJsonPath('message', 'A OS já foi entregue e não pode ser cancelada.');

        $os = $this->osEm(StatusOrdemServico::AguardandoAprovacao);
        $this->postJson($this->url($os, 'orcamento/resposta'), ['aprovado' => false, 'canal' => 'whatsapp'])->assertOk();
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu'])->assertUnprocessable();

        $os = $this->criarOs();
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu'])->assertOk();
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'De novo'])
            ->assertUnprocessable()->assertJsonPath('message', 'A OS já está cancelada.');
    }

    public function test_tela_desatualizada_nao_cancela(): void
    {
        $os = $this->osEm(StatusOrdemServico::AguardandoDiagnostico);

        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu', 'status_atual' => 'aberta'])
            ->assertUnprocessable();
        $this->assertSame(StatusOrdemServico::AguardandoDiagnostico, $os->refresh()->status);
    }

    public function test_cancelada_antes_da_retirada_fica_encerrada(): void
    {
        $os = $this->criarOs();
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Resolveu com outra assistência'])
            ->assertOk()->assertJsonPath('devolucao_pendente', false);

        $this->postJson($this->url($os, 'entrega'))->assertUnprocessable();
        $this->putJson($this->url($os), ['problema_relatado' => 'Outro'])->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->getJson('/api/ordens-servico?pendentes=1')->assertOk()->assertJsonMissing(['id' => $os->id]);
        $this->getJson('/api/acompanhar/'.$os->numero)
            ->assertOk()
            ->assertJsonPath('status_rotulo', 'Cancelada')
            ->assertJsonPath('cancelada', true)
            ->assertJsonPath('proximos', [])
            ->assertJsonMissingPath('motivo_cancelamento');
        $this->assertStringContainsString('cancelamos o reparo do seu Inspiron 15',
            $this->getJson($this->url($os, 'whatsapp'))->json('mensagem'));
    }

    public function test_cancelada_com_equipamento_fica_pendente_ate_a_devolucao_sem_reparo(): void
    {
        $os = $this->osEm(StatusOrdemServico::EmReparo);
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Cliente não quer mais esperar'])->assertOk();

        $this->assertStringContainsString('disponível para retirada na assistência, sem reparo',
            $this->getJson($this->url($os, 'whatsapp'))->json('mensagem'));
        $this->getJson('/api/ordens-servico?pendentes=1')->assertOk()->assertJsonFragment(['id' => $os->id]);
        $this->getJson('/api/acompanhar/'.$os->numero)->assertOk()->assertJsonPath('proximos', ['Entregue'])
            ->assertJsonPath('devolucao_pendente', true);

        // A devolução pode ser combinada como entrega no endereço, como em qualquer OS.
        $this->putJson($this->url($os), ['forma_devolucao' => 'entrega'])->assertOk();

        $this->postJson($this->url($os, 'entrega'))
            ->assertOk()
            ->assertJsonPath('status', 'entregue')
            ->assertJsonPath('garantia', null)
            ->assertJsonPath('historico.'.($os->historico()->count() - 1).'.observacao', 'OS cancelada: equipamento devolvido sem reparo, entregue no endereço do cliente');

        $mensagem = $this->getJson($this->url($os, 'whatsapp'))->json('mensagem');
        $this->assertStringContainsString('devolvido no seu endereço, sem reparo', $mensagem);
        $this->assertStringNotContainsString('garantia', $mensagem);
        $this->getJson('/api/ordens-servico?pendentes=1')->assertOk()->assertJsonMissing(['id' => $os->id]);
    }

    public function test_cancelada_nao_conta_como_parada(): void
    {
        $os = $this->osEm(StatusOrdemServico::AguardandoDiagnostico);
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu'])->assertOk();
        OrdemServico::whereKey($os->id)->update(['data_status' => now()->subDays(10)]);

        $this->getJson('/api/ordens-servico?paradas=1')->assertOk()->assertJsonMissing(['id' => $os->id]);
        $this->getJson($this->url($os))->assertOk()->assertJsonPath('parada', false);
    }

    public function test_voltar_etapa_desfaz_o_cancelamento_e_a_devolucao(): void
    {
        $os = $this->osEm(StatusOrdemServico::AguardandoAprovacao);
        $this->postJson($this->url($os, 'cancelamento'), ['motivo' => 'Desistiu'])->assertOk();
        $this->postJson($this->url($os, 'entrega'))->assertOk();

        // Entregue → Cancelada: a devolução é desfeita, o cancelamento continua.
        $this->postJson($this->url($os, 'voltar-etapa'), ['motivo' => 'Cliente ainda não buscou'])
            ->assertOk()
            ->assertJsonPath('status', 'cancelada')
            ->assertJsonPath('data_entrega', null)
            ->assertJsonPath('motivo_cancelamento', 'Desistiu');

        // Cancelada → etapa de antes, com o orçamento ainda aguardando a resposta.
        $this->postJson($this->url($os, 'voltar-etapa'), ['motivo' => 'Cliente mudou de ideia'])
            ->assertOk()
            ->assertJsonPath('status', 'aguardando_aprovacao')
            ->assertJsonPath('motivo_cancelamento', null)
            ->assertJsonPath('data_cancelamento', null)
            ->assertJsonPath('orcamento.situacao', SituacaoOrcamento::Pendente->value);

        $this->assertSame('voltou_etapa', RegistroAtividade::where('entidade', 'ordem_servico')
            ->where('entidade_id', $os->id)->latest('id')->value('acao'));
    }
}
