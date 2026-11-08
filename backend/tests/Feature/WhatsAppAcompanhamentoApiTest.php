<?php

namespace Tests\Feature;

use App\Models\OrdemServico;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Mensagem pronta do WhatsApp por status (RF18) e consulta de andamento da OS pelo cliente, sem login.
 */
class WhatsAppAcompanhamentoApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Tecnico $tecnico;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = $this->criarTecnico('teste-whatsapp@reparos.test');
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

    private function criarOs(?Tecnico $tecnico = null, array $dados = []): OrdemServico
    {
        return ($tecnico ?? $this->tecnico)->clientes()
            ->create(['nome' => 'Ana Souza', 'telefone_whatsapp' => '119'.random_int(10000000, 99999999), 'endereco' => 'Rua A, 1'])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15'])
            ->ordensServico()
            ->create(['problema_relatado' => 'Não liga', ...$dados]);
    }

    /**
     * Leva a OS, pela própria API, até o orçamento enviado.
     */
    private function enviarOrcamento(OrdemServico $os): void
    {
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
    }

    private function whatsapp(OrdemServico $os): array
    {
        return $this->getJson("/api/ordens-servico/{$os->id}/whatsapp")->assertOk()->json();
    }

    public function test_monta_link_wa_me_com_a_mensagem_do_status(): void
    {
        $os = $this->criarOs(dados: ['retirada_agendada' => '2026-11-12 14:30']);
        $telefone = '55'.$os->equipamento->cliente->telefone_whatsapp;

        $resposta = $this->whatsapp($os);

        $this->assertSame('aberta', $resposta['status']);
        $this->assertSame($telefone, $resposta['telefone']);
        $this->assertStringContainsString("Olá, Ana! Confirmando a retirada do seu Inspiron 15 (OS {$os->numero}) em 12/11 às 14:30.", $resposta['mensagem']);
        $this->assertStringEndsWith("\n\nAssistência Teste", $resposta['mensagem']);
        $this->assertSame("https://wa.me/{$telefone}?text=".rawurlencode($resposta['mensagem']), $resposta['link']);
    }

    public function test_mensagem_muda_conforme_o_status(): void
    {
        $os = $this->criarOs();
        $this->assertStringContainsString('Vamos combinar a retirada?', $this->whatsapp($os)['mensagem']);

        $this->enviarOrcamento($os);
        $mensagem = $this->whatsapp($os)['mensagem'];
        $this->assertStringContainsString('Segue o orçamento do seu Inspiron 15', $mensagem);
        $this->assertStringContainsString('Diagnóstico: Fonte queimada', $mensagem);
        $this->assertStringContainsString('Serviços: Troca da fonte (R$ 1.200,00).', $mensagem);
        $this->assertStringContainsString('Peças: Fonte 65W (R$ 150,00).', $mensagem);
        $this->assertStringContainsString('Total: R$ 1.350,00', $mensagem);
        $this->assertStringContainsString('Prazo: 3 dias úteis após aprovação.', $mensagem);
        $this->assertStringContainsString('Orçamento válido até', $mensagem);

        $this->postJson("/api/ordens-servico/{$os->id}/orcamento/resposta", ['aprovado' => true, 'canal' => 'whatsapp'])->assertOk();
        $this->assertStringContainsString('O reparo do seu Inspiron 15', $this->whatsapp($os)['mensagem']);

        $this->putJson("/api/ordens-servico/{$os->id}/reparo", ['servico_executado' => 'Troca da fonte'])->assertOk();
        $this->postJson("/api/ordens-servico/{$os->id}/pronto")->assertOk();
        $mensagem = $this->whatsapp($os)['mensagem'];
        $this->assertStringContainsString('está pronto para retirada.', $mensagem);
        $this->assertStringContainsString('Total: R$ 1.350,00', $mensagem);

        $this->postJson("/api/ordens-servico/{$os->id}/entrega")->assertOk();
        $this->assertStringContainsString('foi entregue. Obrigado pela confiança!', $this->whatsapp($os)['mensagem']);
    }

    public function test_mensagem_do_orcamento_recusado_fala_da_devolucao(): void
    {
        $os = $this->criarOs();
        $this->enviarOrcamento($os);
        $this->postJson("/api/ordens-servico/{$os->id}/orcamento/resposta", ['aprovado' => false, 'canal' => 'telefone'])->assertOk();

        $this->assertStringContainsString('disponível para devolução, sem reparo', $this->whatsapp($os)['mensagem']);
    }

    public function test_whatsapp_de_os_de_outro_tecnico_responde_404(): void
    {
        $alheia = $this->criarOs($this->criarTecnico('outro-whatsapp@reparos.test'));

        $this->getJson("/api/ordens-servico/{$alheia->id}/whatsapp")->assertNotFound();
    }

    public function test_cliente_acompanha_a_os_pelo_numero_sem_login(): void
    {
        $os = $this->criarOs();
        $this->postJson("/api/ordens-servico/{$os->id}/retirada", ['observacao' => 'Tela riscada, sem carregador'])->assertOk();

        $this->app['auth']->forgetGuards();

        $resposta = $this->getJson('/api/acompanhar/'.strtolower($os->numero))
            ->assertOk()
            ->assertJsonPath('numero', $os->numero)
            ->assertJsonPath('assistencia', 'Assistência Teste')
            ->assertJsonPath('equipamento', ['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15'])
            ->assertJsonPath('status', 'aguardando_diagnostico')
            ->assertJsonPath('status_rotulo', 'Aguardando diagnóstico')
            ->assertJsonPath('proximos', ['Diagnóstico realizado'])
            ->assertJsonPath('orcamento', null)
            ->assertJsonPath('historico.*.status', ['aberta', 'aguardando_diagnostico']);

        // Nada de dados pessoais nem anotações internas do técnico.
        $json = $resposta->getContent();
        foreach (['Ana', $os->equipamento->cliente->telefone_whatsapp, 'Rua A', 'Tela riscada', 'Não liga'] as $privado) {
            $this->assertStringNotContainsString($privado, $json);
        }
    }

    public function test_andamento_mostra_o_orcamento_so_depois_do_envio(): void
    {
        $os = $this->criarOs();
        $this->enviarOrcamento($os);

        $this->getJson("/api/acompanhar/{$os->numero}")
            ->assertOk()
            ->assertJsonPath('status', 'aguardando_aprovacao')
            ->assertJsonPath('orcamento.valor_total', '1350.00')
            ->assertJsonPath('orcamento.situacao', 'pendente');
    }

    public function test_andamento_de_numero_inexistente_responde_404(): void
    {
        $this->getJson('/api/acompanhar/OS-00000000-XXXXX')
            ->assertNotFound()
            ->assertJsonPath('message', 'OS não encontrada.');
    }
}
