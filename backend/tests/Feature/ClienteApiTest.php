<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClienteApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Tecnico $tecnico;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = $this->criarTecnico('teste-clientes@reparos.test');
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

    private function criarCliente(Tecnico $tecnico, array $dados = []): Cliente
    {
        return $tecnico->clientes()->create($dados + [
            'nome' => 'Ana Souza',
            'telefone_whatsapp' => '11988887777',
            'endereco' => 'Rua A, 1',
        ]);
    }

    public function test_exige_login(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/clientes')->assertUnauthorized();
    }

    public function test_cadastra_cliente_guardando_so_os_digitos_do_telefone(): void
    {
        $this->postJson('/api/clientes', [
            'nome' => '  Ana Souza ',
            'telefone_whatsapp' => '(11) 98888-7777',
            'endereco' => 'Rua A, 1',
        ])
            ->assertCreated()
            ->assertJson(['nome' => 'Ana Souza', 'telefone_whatsapp' => '11988887777']);

        $this->assertDatabaseHas('clientes', [
            'tecnico_id' => $this->tecnico->id,
            'telefone_whatsapp' => '11988887777',
        ]);
    }

    public function test_valida_campos_obrigatorios(): void
    {
        $this->postJson('/api/clientes', ['telefone_whatsapp' => '123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nome', 'telefone_whatsapp', 'endereco']);
    }

    public function test_nao_repete_telefone_no_mesmo_tecnico(): void
    {
        $this->criarCliente($this->tecnico);

        $this->postJson('/api/clientes', [
            'nome' => 'Outra Pessoa',
            'telefone_whatsapp' => '+55 (11) 98888-7777',
            'endereco' => 'Rua B, 2',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['telefone_whatsapp' => 'Já existe um cliente com este telefone.']);
    }

    public function test_mesmo_telefone_pode_existir_em_outro_tecnico(): void
    {
        $this->criarCliente($this->criarTecnico('outro@reparos.test'));

        $this->postJson('/api/clientes', [
            'nome' => 'Ana Souza',
            'telefone_whatsapp' => '11988887777',
            'endereco' => 'Rua A, 1',
        ])->assertCreated();
    }

    public function test_lista_so_os_clientes_do_tecnico_em_ordem_de_nome(): void
    {
        $this->criarCliente($this->tecnico, ['nome' => 'Bruno', 'telefone_whatsapp' => '11911111111']);
        $this->criarCliente($this->tecnico, ['nome' => 'Ana', 'telefone_whatsapp' => '11922222222']);
        $this->criarCliente($this->criarTecnico('outro@reparos.test'), ['nome' => 'Carla']);

        $this->getJson('/api/clientes')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.nome', 'Ana')
            ->assertJsonPath('1.nome', 'Bruno')
            ->assertJsonPath('0.equipamentos_count', 0);
    }

    public function test_busca_por_nome_ou_telefone(): void
    {
        $this->criarCliente($this->tecnico, ['nome' => 'Bruno Lima', 'telefone_whatsapp' => '11911111111']);
        $this->criarCliente($this->tecnico, ['nome' => 'Ana Souza', 'telefone_whatsapp' => '11922223333']);

        $this->getJson('/api/clientes?busca=bruno')
            ->assertJsonCount(1)
            ->assertJsonPath('0.nome', 'Bruno Lima');

        $this->getJson('/api/clientes?busca='.urlencode('2222-3333'))
            ->assertJsonCount(1)
            ->assertJsonPath('0.nome', 'Ana Souza');

        // Texto com letras não é comparado com o telefone.
        $this->getJson('/api/clientes?busca=moto+g1')->assertJsonCount(0);
    }

    public function test_ficha_traz_equipamentos_e_ordens(): void
    {
        $cliente = $this->criarCliente($this->tecnico);
        $equipamento = $cliente->equipamentos()->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron']);
        $equipamento->ordensServico()->create(['problema_relatado' => 'Não liga']);

        $this->getJson("/api/clientes/{$cliente->id}")
            ->assertOk()
            ->assertJsonPath('equipamentos.0.modelo', 'Inspiron')
            ->assertJsonPath('equipamentos.0.ordens_servico.0.problema_relatado', 'Não liga');
    }

    public function test_edita_cliente_mantendo_o_proprio_telefone(): void
    {
        $cliente = $this->criarCliente($this->tecnico);

        $this->putJson("/api/clientes/{$cliente->id}", [
            'nome' => 'Ana Souza Lima',
            'telefone_whatsapp' => '11988887777',
            'endereco' => 'Rua Nova, 10',
        ])
            ->assertOk()
            ->assertJson(['nome' => 'Ana Souza Lima', 'endereco' => 'Rua Nova, 10']);
    }

    public function test_nao_acessa_cliente_de_outro_tecnico(): void
    {
        $alheio = $this->criarCliente($this->criarTecnico('outro@reparos.test'));

        $this->getJson("/api/clientes/{$alheio->id}")->assertNotFound();

        $this->putJson("/api/clientes/{$alheio->id}", [
            'nome' => 'Invasor',
            'telefone_whatsapp' => '11900000000',
            'endereco' => 'Rua X, 1',
        ])->assertNotFound();

        $this->assertDatabaseHas('clientes', ['id' => $alheio->id, 'nome' => 'Ana Souza']);
    }
}
