<?php

namespace Tests\Feature;

use App\Enums\StatusOrdemServico;
use App\Models\Cliente;
use App\Models\Equipamento;
use App\Models\OrdemServico;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Tests\TestCase;

class OrdemServicoApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Tecnico $tecnico;

    private Equipamento $equipamento;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = $this->criarTecnico('teste-os@reparos.test');
        $this->equipamento = $this->criarEquipamento($this->criarCliente($this->tecnico));
        Sanctum::actingAs($this->tecnico);
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

    private function criarCliente(Tecnico $tecnico): Cliente
    {
        return $tecnico->clientes()->create([
            'nome' => 'Ana Souza',
            'telefone_whatsapp' => '11988887777',
            'endereco' => 'Rua A, 1',
        ]);
    }

    private function criarEquipamento(Cliente $cliente): Equipamento
    {
        return $cliente->equipamentos()->create([
            'tipo' => 'Notebook',
            'marca' => 'Dell',
            'modelo' => 'Inspiron 15',
        ]);
    }

    private function criarOs(?Equipamento $equipamento = null): OrdemServico
    {
        return ($equipamento ?? $this->equipamento)->ordensServico()->create(['problema_relatado' => 'Não liga']);
    }

    private function osDeOutroTecnico(): OrdemServico
    {
        return $this->criarOs($this->criarEquipamento($this->criarCliente($this->criarTecnico('outro@reparos.test'))));
    }

    public function test_exige_login(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/ordens-servico')->assertUnauthorized();
        $this->postJson('/api/ordens-servico', [])->assertUnauthorized();
    }

    public function test_abre_os_aberta_com_numero_e_historico(): void
    {
        $resposta = $this->postJson('/api/ordens-servico', [
            'equipamento_id' => $this->equipamento->id,
            'problema_relatado' => '  Tela piscando  ',
            'retirada_agendada' => '2026-11-10 14:00',
        ])
            ->assertCreated()
            ->assertJson([
                'status' => 'aberta',
                'problema_relatado' => 'Tela piscando',
                'equipamento' => ['modelo' => 'Inspiron 15', 'cliente' => ['nome' => 'Ana Souza']],
                'historico' => [['status_anterior' => null, 'status_novo' => 'aberta']],
            ]);

        $this->assertMatchesRegularExpression('/^OS-\d{8}-[A-Z0-9]{5}$/', $resposta->json('numero'));
        $this->assertNotNull($resposta->json('data_abertura'));
        // 14:00 em Brasília (fuso da aplicação) volta em UTC no JSON.
        $this->assertStringStartsWith('2026-11-10T17:00', $resposta->json('retirada_agendada'));
    }

    public function test_valida_abertura(): void
    {
        $this->postJson('/api/ordens-servico', ['retirada_agendada' => 'amanhã cedo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'equipamento_id' => 'Selecione o equipamento.',
                'problema_relatado' => 'Descreva o problema relatado pelo cliente.',
                'retirada_agendada',
            ]);
    }

    public function test_nao_abre_os_para_equipamento_de_outro_tecnico(): void
    {
        $alheio = $this->osDeOutroTecnico()->equipamento;

        $this->postJson('/api/ordens-servico', [
            'equipamento_id' => $alheio->id,
            'problema_relatado' => 'Não liga',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['equipamento_id' => 'Equipamento não encontrado.']);
    }

    public function test_lista_so_as_os_do_tecnico_sem_endereco_e_filtra_por_status(): void
    {
        $primeira = $this->criarOs();
        $primeira->mudarStatus(StatusOrdemServico::AguardandoDiagnostico);
        $this->criarOs();
        $this->osDeOutroTecnico();

        $this->getJson('/api/ordens-servico')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.equipamento.cliente.nome', 'Ana Souza')
            ->assertJsonMissingPath('0.equipamento.cliente.endereco');

        $this->getJson('/api/ordens-servico?status=aguardando_diagnostico')
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $primeira->id);

        $this->getJson('/api/ordens-servico?status=qualquer')->assertUnprocessable();
    }

    public function test_nao_acessa_os_de_outro_tecnico(): void
    {
        $alheia = $this->osDeOutroTecnico();
        $base = "/api/ordens-servico/{$alheia->id}";

        $this->getJson($base)->assertNotFound();
        $this->putJson($base, ['problema_relatado' => 'Invasor'])->assertNotFound();
        $this->postJson("{$base}/retirada")->assertNotFound();
        $this->postJson("{$base}/diagnostico", ['diagnostico' => 'X'])->assertNotFound();
        $this->putJson("{$base}/orcamento", [])->assertNotFound();
        $this->postJson("{$base}/orcamento/envio")->assertNotFound();
        $this->postJson("{$base}/orcamento/resposta", [])->assertNotFound();

        $this->assertSame(StatusOrdemServico::Aberta, $alheia->refresh()->status);
        $this->assertSame('Não liga', $alheia->problema_relatado);
    }

    public function test_edita_problema_e_retirada_agendada_so_antes_do_diagnostico(): void
    {
        $os = $this->criarOs();

        $this->putJson("/api/ordens-servico/{$os->id}", [
            'problema_relatado' => 'Não liga e esquenta',
            'retirada_agendada' => '2026-11-12 09:30',
        ])
            ->assertOk()
            ->assertJsonPath('problema_relatado', 'Não liga e esquenta');

        $os->mudarStatus(StatusOrdemServico::AguardandoDiagnostico);
        $os->mudarStatus(StatusOrdemServico::DiagnosticoRealizado);

        $this->putJson("/api/ordens-servico/{$os->id}", ['problema_relatado' => 'Outro'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS só pode ser editada antes do diagnóstico.');
    }

    public function test_registra_retirada_e_diagnostico(): void
    {
        $os = $this->criarOs();

        $this->postJson("/api/ordens-servico/{$os->id}/retirada", ['observacao' => 'Sem carregador, tampa riscada'])
            ->assertOk()
            ->assertJsonPath('status', 'aguardando_diagnostico')
            ->assertJsonPath('historico.1.observacao', 'Sem carregador, tampa riscada');
        $this->assertNotNull($os->refresh()->data_retirada);

        $this->postJson("/api/ordens-servico/{$os->id}/diagnostico", ['diagnostico' => 'Fonte queimada'])
            ->assertOk()
            ->assertJsonPath('status', 'diagnostico_realizado')
            ->assertJsonPath('diagnostico', 'Fonte queimada')
            ->assertJsonCount(3, 'historico');

        // Antes do envio do orçamento, o diagnóstico ainda pode ser corrigido sem novo registro no histórico.
        $this->postJson("/api/ordens-servico/{$os->id}/diagnostico", ['diagnostico' => 'Fonte queimada e cooler sujo'])
            ->assertOk()
            ->assertJsonPath('diagnostico', 'Fonte queimada e cooler sujo')
            ->assertJsonCount(3, 'historico');
    }

    public function test_nao_pula_etapas_do_fluxo(): void
    {
        $os = $this->criarOs();

        $this->postJson("/api/ordens-servico/{$os->id}/diagnostico", ['diagnostico' => 'Fonte queimada'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A OS está em "Aberta" e não pode ir para "Diagnóstico realizado".');

        $this->postJson("/api/ordens-servico/{$os->id}/retirada")->assertOk();
        $this->postJson("/api/ordens-servico/{$os->id}/retirada")->assertUnprocessable();

        $this->assertNull($os->refresh()->diagnostico);
        $this->assertCount(2, $os->historico);
    }

    public function test_valida_diagnostico_e_retirada(): void
    {
        $os = $this->criarOs();

        $this->postJson("/api/ordens-servico/{$os->id}/retirada", ['data_retirada' => now()->addDay()->toDateTimeString()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['data_retirada' => 'A retirada não pode estar no futuro.']);

        $this->postJson("/api/ordens-servico/{$os->id}/diagnostico", ['diagnostico' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['diagnostico' => 'Descreva o diagnóstico.']);
    }

    public function test_historico_nao_pode_ser_alterado_nem_apagado(): void
    {
        $registro = $this->criarOs()->historico()->first();

        try {
            $registro->update(['observacao' => 'Adulterado']);
            $this->fail('O histórico foi alterado.');
        } catch (LogicException) {
        }

        try {
            $registro->delete();
            $this->fail('O histórico foi apagado.');
        } catch (LogicException) {
        }

        $this->assertDatabaseHas('historico_status', ['id' => $registro->id, 'observacao' => 'OS aberta']);
    }
}
