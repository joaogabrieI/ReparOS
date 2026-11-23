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
 * Edição dos dados da OS e volta para a etapa anterior, sempre com registro de quem fez e sem apagar o histórico.
 */
class EdicaoVoltaEtapaApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Usuario $admin;

    private Usuario $tecnica;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Usuario::criarComAssistencia([
            'nome' => 'Admin Teste', 'nome_assistencia' => 'Assistência Teste',
            'email' => 'teste-edicao-admin@reparos.test', 'password' => 'Senha@123',
        ]);
        $this->tecnica = $this->admin->assistencia->usuarios()->create([
            'nome' => 'Ana Técnica', 'email' => 'teste-edicao-tec@reparos.test', 'password' => 'Senha@123', 'perfil' => PerfilUsuario::Tecnico,
        ]);
        Sanctum::actingAs($this->tecnica);
    }

    private function criarOs(?Usuario $dono = null): OrdemServico
    {
        return ($dono ?? $this->admin)->clientes()
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

    /**
     * Leva a OS pela própria API até a etapa pedida.
     */
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
            fn () => $this->postJson($this->url($os, 'entrega')),
        ];

        foreach ($passos as $passo) {
            if ($os->refresh()->status === $alvo) {
                break;
            }
            $passo()->assertOk();
        }

        return $os->refresh();
    }

    public function test_edita_varios_campos_e_registra_antes_depois_e_motivo(): void
    {
        $os = $this->osEm(StatusOrdemServico::DiagnosticoRealizado);
        $historico = $os->historico()->count();

        $this->putJson($this->url($os), [
            'problema_relatado' => ' Não liga e esquenta ',
            'diagnostico' => 'Fonte queimada e cooler sujo',
            'responsavel_id' => $this->admin->id,
            'motivo' => 'Cliente explicou melhor o defeito',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'diagnostico_realizado')
            ->assertJsonPath('problema_relatado', 'Não liga e esquenta')
            ->assertJsonPath('diagnostico', 'Fonte queimada e cooler sujo')
            ->assertJsonPath('responsavel.id', $this->admin->id)
            ->assertJsonCount($historico, 'historico');

        $registro = RegistroAtividade::where('entidade', 'ordem_servico')->where('entidade_id', $os->id)
            ->where('acao', 'alterou')->latest('id')->firstOrFail();
        $this->assertSame($this->tecnica->id, $registro->usuario_id);
        $this->assertStringContainsString('Motivo: Cliente explicou melhor o defeito', $registro->descricao);
        $this->assertSame('Fonte queimada', $registro->dados_anteriores['diagnostico']);
        $this->assertSame('Não liga', $registro->dados_anteriores['problema_relatado']);
        $this->assertSame($this->admin->id, $registro->dados_novos['responsavel_id']);
    }

    public function test_cada_campo_so_muda_nas_etapas_permitidas(): void
    {
        $os = $this->criarOs();

        $this->putJson($this->url($os), ['diagnostico' => 'Fonte', 'servico_executado' => 'Troca'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'diagnostico' => 'Não é possível alterar o diagnóstico com a OS em "Aberta".',
                'servico_executado' => 'Não é possível alterar o serviço executado com a OS em "Aberta".',
            ]);

        $os = $this->osEm(StatusOrdemServico::DiagnosticoRealizado);
        $outro = $os->equipamento->cliente->equipamentos()->create(['tipo' => 'Celular', 'marca' => 'Moto', 'modelo' => 'G8']);

        $this->putJson($this->url($os), ['equipamento_id' => $outro->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['equipamento_id' => 'Não é possível alterar o equipamento com a OS em "Diagnóstico realizado".']);

        // Reenviar o valor que já está gravado não conta como alteração.
        $this->putJson($this->url($os), ['equipamento_id' => $os->equipamento_id, 'diagnostico' => 'Fonte queimada de novo'])
            ->assertOk();
    }

    public function test_troca_equipamento_antes_do_diagnostico_so_por_um_da_assistencia(): void
    {
        $os = $this->criarOs();
        $outro = $os->equipamento->cliente->equipamentos()->create(['tipo' => 'Celular', 'marca' => 'Moto', 'modelo' => 'G8']);
        $alheio = $this->criarOs(Usuario::criarComAssistencia([
            'nome' => 'Outro', 'nome_assistencia' => 'Outra', 'email' => 'teste-edicao-outro@reparos.test', 'password' => 'Senha@123',
        ]))->equipamento;

        $this->putJson($this->url($os), ['equipamento_id' => $alheio->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['equipamento_id' => 'Equipamento não encontrado.']);

        $this->putJson($this->url($os), ['equipamento_id' => $outro->id])
            ->assertOk()
            ->assertJsonPath('equipamento.modelo', 'G8');
    }

    public function test_os_entregue_nao_e_editada(): void
    {
        $os = $this->osEm(StatusOrdemServico::Entregue);

        $this->putJson($this->url($os), ['problema_relatado' => 'Outro'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'A OS já foi entregue e não pode ser editada. Volte a etapa para corrigir algum dado.']);
    }

    public function test_volta_da_retirada_para_aberta_com_novo_registro_no_historico(): void
    {
        $os = $this->osEm(StatusOrdemServico::AguardandoDiagnostico);
        $antes = $os->historico()->get(['id', 'status_novo', 'observacao'])->toArray();

        $this->postJson($this->url($os, 'voltar-etapa'), ['motivo' => 'Retirada marcada por engano', 'status_atual' => 'aguardando_diagnostico'])
            ->assertOk()
            ->assertJsonPath('status', 'aberta')
            ->assertJsonCount(3, 'historico')
            ->assertJsonPath('historico.2.status_anterior', 'aguardando_diagnostico')
            ->assertJsonPath('historico.2.status_novo', 'aberta')
            ->assertJsonPath('historico.2.retorno', true)
            ->assertJsonPath('historico.2.observacao', 'Retirada marcada por engano')
            ->assertJsonPath('historico.2.usuario.nome', 'Ana Técnica')
            ->assertJsonPath('data_retirada', null);

        // Os registros anteriores continuam como estavam.
        $this->assertSame($antes, $os->historico()->limit(2)->get(['id', 'status_novo', 'observacao'])->toArray());
        $this->assertDatabaseHas('registros_atividade', [
            'acao' => 'voltou_etapa', 'entidade_id' => $os->id, 'usuario_id' => $this->tecnica->id,
            'descricao' => "OS {$os->numero}: voltou de Aguardando diagnóstico para Aberta. Motivo: Retirada marcada por engano",
        ]);

        // Dali a OS segue o fluxo normal de novo.
        $this->postJson($this->url($os, 'retirada'))->assertOk()->assertJsonPath('status', 'aguardando_diagnostico');
    }

    public function test_volta_orcamento_enviado_para_rascunho_e_pode_ser_reenviado(): void
    {
        $os = $this->osEm(StatusOrdemServico::AguardandoAprovacao);

        $this->postJson($this->url($os, 'voltar-etapa'), ['motivo' => 'Valor da peça errado'])
            ->assertOk()
            ->assertJsonPath('status', 'diagnostico_realizado');

        $orcamento = $os->refresh()->orcamento;
        $this->assertNull($orcamento->data_envio);
        $this->assertNull($orcamento->validade_ate);

        // O orçamento pode ser corrigido e reenviado.
        $this->putJson($this->url($os, 'orcamento'), [
            'prazo_dias' => 3,
            'itens' => [['tipo' => 'peca', 'descricao' => 'Fonte 65W', 'quantidade' => 1, 'valor_unitario' => 120]],
        ])->assertOk()->assertJsonPath('valor_total', '120.00');
        $this->postJson($this->url($os, 'orcamento/envio'))->assertOk()->assertJsonPath('status', 'aguardando_aprovacao');
    }

    public function test_volta_resposta_do_cliente_e_o_orcamento_aguarda_nova_resposta(): void
    {
        $os = $this->osEm(StatusOrdemServico::EmReparo);
        $this->assertSame(SituacaoOrcamento::Aprovado, $os->orcamento->situacao);

        $this->postJson($this->url($os, 'voltar-etapa'), ['motivo' => 'Cliente aprovou outra OS, não esta'])
            ->assertOk()
            ->assertJsonPath('status', 'aguardando_aprovacao')
            ->assertJsonPath('orcamento.situacao', 'pendente')
            ->assertJsonPath('orcamento.data_resposta', null)
            ->assertJsonPath('orcamento.prazo_entrega', null);

        $this->postJson($this->url($os, 'orcamento/resposta'), ['aprovado' => false, 'canal' => 'telefone'])
            ->assertOk()
            ->assertJsonPath('status', 'orcamento_recusado');
    }

    public function test_volta_entrega_para_a_etapa_de_onde_veio(): void
    {
        $pronta = $this->osEm(StatusOrdemServico::Entregue);
        $this->postJson($this->url($pronta, 'voltar-etapa'), ['motivo' => 'Cliente ainda não buscou'])
            ->assertOk()
            ->assertJsonPath('status', 'pronto_para_retirada')
            ->assertJsonPath('data_entrega', null);

        $recusada = $this->osEm(StatusOrdemServico::AguardandoAprovacao);
        $this->postJson($this->url($recusada, 'orcamento/resposta'), ['aprovado' => false, 'canal' => 'whatsapp'])->assertOk();
        $this->postJson($this->url($recusada, 'entrega'))->assertOk();

        $this->postJson($this->url($recusada, 'voltar-etapa'), ['motivo' => 'Devolução registrada antes da hora'])
            ->assertOk()
            ->assertJsonPath('status', 'orcamento_recusado');
    }

    public function test_exige_motivo_nao_volta_de_aberta_nem_de_tela_desatualizada(): void
    {
        $os = $this->criarOs();

        $this->postJson($this->url($os, 'voltar-etapa'), ['motivo' => '  '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['motivo' => 'Informe o motivo para voltar a etapa.']);

        $this->postJson($this->url($os, 'voltar-etapa'), ['motivo' => 'Engano'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS está em "Aberta" e não tem etapa anterior para voltar.');

        // Clique duplo: a tela ainda mostra "Diagnóstico realizado", mas a OS já voltou uma etapa.
        $os = $this->osEm(StatusOrdemServico::DiagnosticoRealizado);
        $corpo = ['motivo' => 'Diagnóstico no aparelho errado', 'status_atual' => 'diagnostico_realizado'];
        $this->postJson($this->url($os, 'voltar-etapa'), $corpo)->assertOk()->assertJsonPath('status', 'aguardando_diagnostico');
        $this->postJson($this->url($os, 'voltar-etapa'), $corpo)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS já está em "Aguardando diagnóstico". Recarregue a tela antes de voltar a etapa.');

        $this->assertSame(StatusOrdemServico::AguardandoDiagnostico, $os->refresh()->status);
    }

    public function test_nao_edita_nem_volta_os_de_outra_assistencia(): void
    {
        $alheia = $this->criarOs(Usuario::criarComAssistencia([
            'nome' => 'Outro', 'nome_assistencia' => 'Outra', 'email' => 'teste-edicao-alheia@reparos.test', 'password' => 'Senha@123',
        ]));
        $alheia->mudarStatus(StatusOrdemServico::AguardandoDiagnostico);

        $this->putJson($this->url($alheia), ['problema_relatado' => 'Invadido'])->assertNotFound();
        $this->postJson($this->url($alheia, 'voltar-etapa'), ['motivo' => 'Invadido'])->assertNotFound();

        $this->assertSame(StatusOrdemServico::AguardandoDiagnostico, $alheia->refresh()->status);
        $this->assertSame('Não liga', $alheia->problema_relatado);
    }
}
