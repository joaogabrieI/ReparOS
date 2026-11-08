<?php

namespace Tests\Feature;

use App\Enums\StatusOrdemServico;
use App\Models\Cliente;
use App\Models\OrdemServico;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Busca e filtros da lista de OS, e o destaque das OS paradas (RF23, RF24).
 */
class BuscaOsApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Tecnico $tecnico;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = $this->criarTecnico('teste-busca@reparos.test');
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

    private function criarCliente(string $nome, string $telefone, ?Tecnico $tecnico = null): Cliente
    {
        return ($tecnico ?? $this->tecnico)->clientes()
            ->create(['nome' => $nome, 'telefone_whatsapp' => $telefone, 'endereco' => 'Rua A, 1']);
    }

    private function criarOs(Cliente $cliente, string $tipo = 'Notebook', string $marca = 'Dell', string $modelo = 'Inspiron 15'): OrdemServico
    {
        return $cliente->equipamentos()
            ->create(['tipo' => $tipo, 'marca' => $marca, 'modelo' => $modelo])
            ->ordensServico()
            ->create(['problema_relatado' => 'Não liga']);
    }

    /**
     * @return list<string>
     */
    private function numeros(string $query = ''): array
    {
        return $this->getJson('/api/ordens-servico'.($query !== '' ? '?'.$query : ''))
            ->assertOk()
            ->json('*.numero');
    }

    public function test_busca_por_numero_cliente_telefone_e_modelo(): void
    {
        $ana = $this->criarOs($this->criarCliente('Ana Souza', '11988887777'));
        $bruno = $this->criarOs($this->criarCliente('Bruno Lima', '11977776666'), 'Smartphone', 'Motorola', 'Moto G84');

        $this->assertSame([$ana->numero], $this->numeros('busca='.$ana->numero));
        $this->assertSame([$ana->numero], $this->numeros('busca=ana'));
        $this->assertSame([$bruno->numero], $this->numeros('busca='.urlencode('(11) 97777-6666')));
        $this->assertSame([$bruno->numero], $this->numeros('busca=moto'));
        $this->assertSame([$ana->numero], $this->numeros('busca=dell'));
        // "G84" não parece telefone, então só compara com o modelo.
        $this->assertSame([$bruno->numero], $this->numeros('busca=G84'));
    }

    public function test_filtra_por_tipo_status_periodo_e_pendentes(): void
    {
        $cliente = $this->criarCliente('Ana Souza', '11988887777');

        Carbon::setTestNow('2026-10-01 10:00');
        $antiga = $this->criarOs($cliente);
        Carbon::setTestNow('2026-10-20 10:00');
        $nova = $this->criarOs($cliente, 'Smartphone', 'Apple', 'iPhone 13');
        $nova->mudarStatus(StatusOrdemServico::AguardandoDiagnostico);
        Carbon::setTestNow();

        // Sem forçar o fluxo inteiro: basta a OS constar como entregue para o filtro de pendentes.
        OrdemServico::whereKey($antiga->id)->update(['status' => StatusOrdemServico::Entregue]);

        $this->assertSame([$nova->numero], $this->numeros('tipo=Smartphone'));
        $this->assertSame([$nova->numero], $this->numeros('status=aguardando_diagnostico'));
        $this->assertSame([$antiga->numero], $this->numeros('de=2026-09-30&ate=2026-10-01'));
        $this->assertSame([$nova->numero], $this->numeros('de=2026-10-20'));
        $this->assertSame([$nova->numero], $this->numeros('pendentes=1'));
        $this->assertSame([$nova->numero, $antiga->numero], $this->numeros());
        $this->assertSame([$antiga->numero, $nova->numero], $this->numeros('ordem=antigas'));
    }

    public function test_ordena_pela_ultima_mudanca_de_status(): void
    {
        $cliente = $this->criarCliente('Ana Souza', '11988887777');

        Carbon::setTestNow('2026-10-01 10:00');
        $primeira = $this->criarOs($cliente);
        Carbon::setTestNow('2026-10-02 10:00');
        $segunda = $this->criarOs($cliente);
        Carbon::setTestNow('2026-10-03 10:00');
        $primeira->mudarStatus(StatusOrdemServico::AguardandoDiagnostico);
        Carbon::setTestNow();

        $this->assertSame([$segunda->numero, $primeira->numero], $this->numeros());
        $this->assertSame([$primeira->numero, $segunda->numero], $this->numeros('ordem=mudanca'));
    }

    public function test_marca_e_filtra_as_os_paradas_ha_mais_de_3_dias(): void
    {
        $cliente = $this->criarCliente('Ana Souza', '11988887777');
        Carbon::setTestNow('2026-11-10 15:00');

        $parada = $this->criarOs($cliente);
        $limite = $this->criarOs($cliente);
        $entregue = $this->criarOs($cliente);
        OrdemServico::whereKey($parada->id)->update(['data_status' => '2026-11-06 18:00']);
        OrdemServico::whereKey($limite->id)->update(['data_status' => '2026-11-07 08:00']);
        OrdemServico::whereKey($entregue->id)->update(['data_status' => '2026-11-01 08:00', 'status' => StatusOrdemServico::Entregue]);

        $this->assertSame([$parada->numero], $this->numeros('paradas=1'));

        $lista = collect($this->getJson('/api/ordens-servico')->json())->keyBy('numero');
        $this->assertSame([4, true], [$lista[$parada->numero]['dias_na_etapa'], $lista[$parada->numero]['parada']]);
        $this->assertSame([3, false], [$lista[$limite->numero]['dias_na_etapa'], $lista[$limite->numero]['parada']]);
        $this->assertFalse($lista[$entregue->numero]['parada']);
    }

    public function test_busca_nao_encontra_os_de_outro_tecnico(): void
    {
        $outro = $this->criarTecnico('outro-busca@reparos.test');
        $alheia = $this->criarOs($this->criarCliente('Ana Souza', '11988887777', $outro));

        $this->assertSame([], $this->numeros('busca='.$alheia->numero));
        $this->assertSame([], $this->numeros('busca=ana'));
    }

    public function test_valida_os_filtros(): void
    {
        $this->getJson('/api/ordens-servico?status=quebrada&tipo=Geladeira&de=01/10/2026&pendentes=talvez&ordem=valor')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'tipo', 'de', 'pendentes', 'ordem'])
            ->assertJsonPath('errors.tipo.0', 'Tipo de equipamento inválido.');

        $this->getJson('/api/ordens-servico?de=2026-10-10&ate=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonPath('errors.ate.0', 'A data final não pode ser antes da inicial.');
    }
}
