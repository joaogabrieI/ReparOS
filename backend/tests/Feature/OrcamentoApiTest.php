<?php

namespace Tests\Feature;

use App\Enums\StatusOrdemServico;
use App\Models\OrdemServico;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrcamentoApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private OrdemServico $os;

    protected function setUp(): void
    {
        parent::setUp();

        $tecnico = Tecnico::create([
            'nome' => 'Técnico Teste',
            'nome_assistencia' => 'Assistência Teste',
            'email' => 'teste-orcamento@reparos.test',
            'password' => 'senha123',
        ]);
        $equipamento = $tecnico->clientes()
            ->create(['nome' => 'Ana Souza', 'telefone_whatsapp' => '11988887777', 'endereco' => 'Rua A, 1'])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15']);

        $this->os = $equipamento->ordensServico()->create(['problema_relatado' => 'Não liga']);
        $this->os->mudarStatus(StatusOrdemServico::AguardandoDiagnostico);
        $this->os->update(['diagnostico' => 'Fonte queimada']);
        $this->os->mudarStatus(StatusOrdemServico::DiagnosticoRealizado);

        Sanctum::actingAs($tecnico);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function url(string $sufixo = ''): string
    {
        return "/api/ordens-servico/{$this->os->id}/orcamento{$sufixo}";
    }

    private function dadosOrcamento(array $dados = []): array
    {
        return $dados + [
            'prazo_dias' => 3,
            'itens' => [
                ['tipo' => 'peca', 'descricao' => ' Fonte 65W ', 'quantidade' => 2, 'valor_unitario' => 120.50],
                ['tipo' => 'servico', 'descricao' => 'Troca da fonte', 'quantidade' => 1, 'valor_unitario' => 80],
            ],
        ];
    }

    private function lancarEEnviar(): void
    {
        $this->putJson($this->url(), $this->dadosOrcamento())->assertCreated();
        $this->postJson($this->url('/envio'))->assertOk();
    }

    public function test_lanca_orcamento_e_calcula_total_no_servidor(): void
    {
        $this->putJson($this->url(), $this->dadosOrcamento(['valor_total' => 1]))
            ->assertCreated()
            ->assertJson([
                'valor_total' => '321.00',
                'prazo_dias' => 3,
                'validade_dias' => 10,
                'data_envio' => null,
                'itens' => [
                    ['tipo' => 'peca', 'descricao' => 'Fonte 65W', 'quantidade' => 2, 'valor_unitario' => '120.50'],
                    ['tipo' => 'servico', 'descricao' => 'Troca da fonte'],
                ],
            ]);
    }

    public function test_corrige_orcamento_antes_do_envio_substituindo_os_itens(): void
    {
        $this->putJson($this->url(), $this->dadosOrcamento())->assertCreated();

        $this->putJson($this->url(), [
            'prazo_dias' => 5,
            'validade_dias' => 15,
            'itens' => [['tipo' => 'servico', 'descricao' => 'Limpeza', 'quantidade' => 1, 'valor_unitario' => 70]],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'itens')
            ->assertJson(['valor_total' => '70.00', 'prazo_dias' => 5, 'validade_dias' => 15]);

        $this->assertSame(1, $this->os->orcamento()->count());
        $this->assertSame(1, $this->os->orcamento->itens()->count());
    }

    public function test_valida_orcamento(): void
    {
        $this->putJson($this->url(), ['itens' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'prazo_dias' => 'Informe o prazo de entrega em dias úteis.',
                'itens' => 'Inclua ao menos um item no orçamento.',
            ]);

        $this->putJson($this->url(), [
            'prazo_dias' => 3,
            'validade_dias' => 0,
            'itens' => [['tipo' => 'brinde', 'descricao' => '', 'quantidade' => 0, 'valor_unitario' => -1]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'validade_dias' => 'A validade deve ficar entre 1 e 90 dias.',
                'itens.0.tipo' => 'O item deve ser peça ou serviço.',
                'itens.0.descricao' => 'Descreva o item.',
                'itens.0.quantidade' => 'A quantidade deve ficar entre 1 e 999.',
                'itens.0.valor_unitario' => 'O valor não pode ser negativo.',
            ]);
    }

    public function test_nao_lanca_orcamento_antes_do_diagnostico(): void
    {
        $nova = $this->os->equipamento->ordensServico()->create(['problema_relatado' => 'Teclado falhando']);

        $this->putJson("/api/ordens-servico/{$nova->id}/orcamento", $this->dadosOrcamento())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Registre o diagnóstico antes de lançar o orçamento.');
    }

    public function test_envio_grava_validade_e_passa_por_enviado_ate_aguardando_aprovacao(): void
    {
        Carbon::setTestNow('2026-11-09 10:00:00');

        $this->putJson($this->url(), $this->dadosOrcamento())->assertCreated();

        $this->postJson($this->url('/envio'))
            ->assertOk()
            ->assertJsonPath('status', 'aguardando_aprovacao')
            ->assertJsonPath('orcamento.situacao', 'pendente')
            ->assertJsonPath('orcamento.vencido', false)
            ->assertJsonPath('historico.3.status_novo', 'orcamento_enviado')
            ->assertJsonPath('historico.4.status_novo', 'aguardando_aprovacao');

        $orcamento = $this->os->refresh()->orcamento;
        $this->assertSame('2026-11-09 10:00:00', $orcamento->data_envio->toDateTimeString());
        $this->assertSame('2026-11-19', $orcamento->validade_ate->toDateString());

        Carbon::setTestNow('2026-11-20 08:00:00');
        $this->getJson("/api/ordens-servico/{$this->os->id}")->assertJsonPath('orcamento.vencido', true);
    }

    public function test_nao_envia_sem_orcamento_lancado(): void
    {
        $this->postJson($this->url('/envio'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Lance o orçamento antes de enviá-lo.');

        $this->assertSame(StatusOrdemServico::DiagnosticoRealizado, $this->os->refresh()->status);
    }

    public function test_orcamento_enviado_fica_travado(): void
    {
        $this->lancarEEnviar();

        $this->putJson($this->url(), $this->dadosOrcamento(['prazo_dias' => 1]))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'O orçamento já foi enviado ao cliente e não pode mais ser alterado.');
        $this->postJson("/api/ordens-servico/{$this->os->id}/diagnostico", ['diagnostico' => 'Outro'])
            ->assertUnprocessable();
        $this->postJson($this->url('/envio'))->assertUnprocessable();

        $this->assertSame('321.00', $this->os->refresh()->orcamento->valor_total);
        $this->assertSame('Fonte queimada', $this->os->diagnostico);
    }

    public function test_aprovacao_leva_a_em_reparo_e_fixa_o_prazo_em_dias_uteis(): void
    {
        Carbon::setTestNow('2026-11-12 15:00:00'); // quinta-feira
        $this->lancarEEnviar();

        $this->postJson($this->url('/resposta'), ['aprovado' => true, 'canal' => 'whatsapp'])
            ->assertOk()
            ->assertJsonPath('status', 'em_reparo')
            ->assertJsonPath('orcamento.situacao', 'aprovado')
            ->assertJsonPath('orcamento.canal_resposta', 'whatsapp')
            ->assertJsonPath('historico.5.observacao', 'Orçamento aprovado pelo cliente via whatsapp.');

        $orcamento = $this->os->refresh()->orcamento;
        $this->assertSame('2026-11-12 15:00:00', $orcamento->data_resposta->toDateTimeString());
        // 3 dias úteis a partir de quinta: sexta, segunda e terça.
        $this->assertSame('2026-11-17', $orcamento->prazo_entrega->toDateString());
    }

    public function test_recusa_leva_a_orcamento_recusado(): void
    {
        $this->lancarEEnviar();

        $this->postJson($this->url('/resposta'), [
            'aprovado' => false,
            'canal' => 'telefone',
            'observacao' => 'Achou caro.',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'orcamento_recusado')
            ->assertJsonPath('orcamento.situacao', 'recusado')
            ->assertJsonPath('orcamento.prazo_entrega', null)
            ->assertJsonPath('historico.5.observacao', 'Orçamento recusado pelo cliente via telefone. Achou caro.');

        // A resposta é registrada uma vez só.
        $this->postJson($this->url('/resposta'), ['aprovado' => true, 'canal' => 'whatsapp'])->assertUnprocessable();
        $this->assertSame(StatusOrdemServico::OrcamentoRecusado, $this->os->refresh()->status);
    }

    public function test_nao_registra_resposta_antes_do_envio(): void
    {
        $this->putJson($this->url(), $this->dadosOrcamento())->assertCreated();

        $this->postJson($this->url('/resposta'), ['aprovado' => true, 'canal' => 'whatsapp'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Envie o orçamento ao cliente antes de registrar a resposta.');

        $this->postJson($this->url('/resposta'), ['canal' => 'email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'aprovado' => 'Informe se o cliente aprovou ou recusou o orçamento.',
                'canal' => 'O canal deve ser WhatsApp, telefone ou presencial.',
            ]);
    }
}
