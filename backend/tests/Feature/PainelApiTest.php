<?php

namespace Tests\Feature;

use App\Enums\StatusOrdemServico;
use App\Models\OrdemServico;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Resumo do painel (/api/painel): contagens, agenda de hoje e amanhã, ações e atividade recente,
 * usado pela tela Início, pela barra lateral e pelas OS pendentes.
 */
class PainelApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Usuario $tecnico;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-23 10:00:00'));
        $this->tecnico = $this->criarTecnico('teste-painel@reparos.test');
        Sanctum::actingAs($this->tecnico);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function criarTecnico(string $email): Usuario
    {
        return Usuario::criarComAssistencia([
            'nome' => 'Técnico Teste',
            'nome_assistencia' => 'Assistência Teste',
            'email' => $email,
            'password' => 'senha123',
        ]);
    }

    /**
     * OS já na situação pedida, sem passar pelas etapas: `$campos` vai direto para o banco.
     */
    private function criarOs(array $campos = [], ?Usuario $tecnico = null): OrdemServico
    {
        $os = ($tecnico ?? $this->tecnico)->clientes()
            ->create(['nome' => 'Ana Souza', 'telefone_whatsapp' => '119'.random_int(10000000, 99999999), 'endereco' => 'Rua do Cadastro, 1'])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron 15'])
            ->ordensServico()
            ->create(['problema_relatado' => 'Não liga']);

        $os->forceFill($campos)->save();

        return $os->refresh();
    }

    public function test_conta_pendentes_paradas_prontas_e_entregues(): void
    {
        $this->criarOs();
        $this->criarOs(['status' => StatusOrdemServico::EmReparo, 'data_retirada' => now()->subDays(6), 'data_status' => now()->subDays(5)]);
        $this->criarOs(['status' => StatusOrdemServico::ProntoParaRetirada, 'data_retirada' => now()->subDays(2), 'data_status' => now()->subDay()]);
        $this->criarOs(['status' => StatusOrdemServico::Entregue, 'data_entrega' => now()->subDays(3), 'data_status' => now()->subDays(3)]);
        $this->criarOs(['status' => StatusOrdemServico::Entregue, 'data_entrega' => Carbon::parse('2026-10-10 15:00'), 'data_status' => Carbon::parse('2026-10-10 15:00')]);
        // Cancelada antes da retirada: encerrada. Cancelada com o equipamento na assistência: pendente até a devolução.
        $this->criarOs(['status' => StatusOrdemServico::Cancelada, 'data_cancelamento' => now()]);
        $this->criarOs(['status' => StatusOrdemServico::Cancelada, 'data_cancelamento' => now(), 'data_retirada' => now()->subDay()]);
        // Outra assistência não entra na conta.
        $this->criarOs(['status' => StatusOrdemServico::EmReparo, 'data_status' => now()->subDays(9)], $this->criarTecnico('outra-painel@reparos.test'));

        $painel = $this->getJson('/api/painel')->assertOk();

        $painel->assertJsonPath('pendentes', 4)
            ->assertJsonPath('por_status.aberta', 1)
            ->assertJsonPath('por_status.em_reparo', 1)
            ->assertJsonPath('por_status.pronto_para_retirada', 1)
            ->assertJsonPath('por_status.cancelada', 1)
            ->assertJsonPath('por_status.entregue', 0)
            ->assertJsonPath('paradas', 1)
            ->assertJsonPath('parada_mais_antiga_dias', 5)
            ->assertJsonPath('prontas', 1)
            ->assertJsonPath('abertas_hoje', 7)
            ->assertJsonPath('entregues_mes', 1)
            ->assertJsonPath('entregues_mes_anterior', 1);
        $this->assertNotNull($painel->json('pronta_desde'));
    }

    public function test_agenda_de_hoje_e_amanha_com_retiradas_e_entregas_em_ordem_de_horario(): void
    {
        $retirada = $this->criarOs(['retirada_agendada' => Carbon::parse('2026-11-23 16:00')]);
        // Retirada daqui a três dias: fora da agenda.
        $this->criarOs(['retirada_agendada' => Carbon::parse('2026-11-26 09:00')]);
        $entregaPronta = $this->criarOs([
            'status' => StatusOrdemServico::ProntoParaRetirada,
            'data_retirada' => now()->subDays(2),
            'forma_devolucao' => 'entrega',
            'endereco_entrega' => 'Rua da Entrega, 50',
            'entrega_agendada' => Carbon::parse('2026-11-24 09:30'),
        ]);
        // Entrega marcada com o reparo em andamento: aparece, mas como "ainda não pronta".
        $entregaEmReparo = $this->criarOs([
            'status' => StatusOrdemServico::EmReparo,
            'data_retirada' => now()->subDays(2),
            'forma_devolucao' => 'entrega',
            'entrega_agendada' => Carbon::parse('2026-11-23 11:00'),
        ]);

        $agenda = $this->getJson('/api/painel')->assertOk()->json('agenda');

        $this->assertSame([$entregaEmReparo->id, $retirada->id, $entregaPronta->id], array_column(array_column($agenda, 'ordem'), 'id'));
        $this->assertSame(['entrega', 'retirada', 'entrega'], array_column($agenda, 'tipo'));
        $this->assertSame([false, true, true], array_column($agenda, 'pronta'));
        // Entrega sem endereço próprio usa o do cadastro (gravado na OS); retirada usa o do cadastro.
        $this->assertSame(['Rua do Cadastro, 1', 'Rua do Cadastro, 1', 'Rua da Entrega, 50'], array_column($agenda, 'endereco'));
        // O endereço do cliente não vai junto com a OS, como na lista de OS.
        $this->assertArrayNotHasKey('endereco', $agenda[0]['ordem']['equipamento']['cliente']);
    }

    public function test_acoes_mostram_paradas_primeiro_sem_as_abertas(): void
    {
        $this->criarOs(['retirada_agendada' => now()->addHour()]);
        $recente = $this->criarOs(['status' => StatusOrdemServico::AguardandoDiagnostico, 'data_retirada' => now(), 'data_status' => now()]);
        $parada = $this->criarOs(['status' => StatusOrdemServico::AguardandoAprovacao, 'data_retirada' => now()->subDays(8), 'data_status' => now()->subDays(7)]);
        $doisDias = $this->criarOs(['status' => StatusOrdemServico::EmReparo, 'data_retirada' => now()->subDays(3), 'data_status' => now()->subDays(2)]);

        $acoes = $this->getJson('/api/painel')->assertOk()->json('acoes');

        $this->assertSame([$parada->id, $doisDias->id, $recente->id], array_column($acoes, 'id'));
        $this->assertTrue($acoes[0]['parada']);
        $this->assertSame('Ana Souza', $acoes[0]['equipamento']['cliente']['nome']);
    }

    public function test_acoes_e_atividade_tem_limite(): void
    {
        foreach (range(1, 8) as $dia) {
            $this->criarOs(['status' => StatusOrdemServico::EmReparo, 'data_retirada' => now()->subDays($dia + 1), 'data_status' => now()->subDays($dia)]);
        }

        $painel = $this->getJson('/api/painel')->assertOk();

        $this->assertCount(5, $painel->json('acoes'));
        $this->assertCount(6, $painel->json('atividade'));
        // Atividade recente: última mudança de status primeiro.
        $this->assertSame(1, $painel->json('atividade.0.dias_na_etapa'));
    }

    public function test_exige_login(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/painel')->assertUnauthorized();
    }
}
