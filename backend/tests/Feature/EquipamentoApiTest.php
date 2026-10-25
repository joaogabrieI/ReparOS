<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Equipamento;
use App\Models\Tecnico;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EquipamentoApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private Tecnico $tecnico;

    private Cliente $cliente;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tecnico = $this->criarTecnico('teste-equipamentos@reparos.test');
        $this->cliente = $this->criarCliente($this->tecnico);
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

    private function criarEquipamento(Cliente $cliente, array $dados = []): Equipamento
    {
        return $cliente->equipamentos()->create($dados + [
            'tipo' => 'Notebook',
            'marca' => 'Dell',
            'modelo' => 'Inspiron 15',
        ]);
    }

    public function test_exige_login(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/equipamentos')->assertUnauthorized();
    }

    public function test_cadastra_equipamento_vinculado_ao_cliente(): void
    {
        $this->postJson('/api/equipamentos', [
            'cliente_id' => $this->cliente->id,
            'tipo' => 'Smartphone',
            'marca' => ' Samsung ',
            'modelo' => 'Galaxy S21',
            'numero_serie' => '',
        ])
            ->assertCreated()
            ->assertJson([
                'cliente_id' => $this->cliente->id,
                'marca' => 'Samsung',
                'numero_serie' => null,
                'cliente' => ['nome' => 'Ana Souza'],
            ]);

        $this->assertDatabaseHas('equipamentos', ['cliente_id' => $this->cliente->id, 'modelo' => 'Galaxy S21']);
    }

    public function test_valida_campos_obrigatorios_e_tipo(): void
    {
        $this->postJson('/api/equipamentos', ['tipo' => 'Geladeira'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'cliente_id' => 'Informe o cliente dono do equipamento.',
                'tipo' => 'Selecione um tipo da lista.',
                'marca',
                'modelo',
            ]);
    }

    public function test_nao_cadastra_para_cliente_de_outro_tecnico(): void
    {
        $alheio = $this->criarCliente($this->criarTecnico('outro@reparos.test'));

        $this->postJson('/api/equipamentos', [
            'cliente_id' => $alheio->id,
            'tipo' => 'Tablet',
            'marca' => 'Apple',
            'modelo' => 'iPad',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cliente_id' => 'Cliente não encontrado.']);

        $this->assertDatabaseMissing('equipamentos', ['cliente_id' => $alheio->id]);
    }

    public function test_lista_so_os_equipamentos_dos_clientes_do_tecnico(): void
    {
        $bruno = $this->criarCliente($this->tecnico, ['nome' => 'Bruno', 'telefone_whatsapp' => '11911111111']);
        $this->criarEquipamento($bruno, ['modelo' => 'Xbox Series S', 'tipo' => 'Videogame', 'marca' => 'Microsoft']);
        $equipamento = $this->criarEquipamento($this->cliente);
        $equipamento->ordensServico()->create(['problema_relatado' => 'Não liga']);
        $this->criarEquipamento($this->criarCliente($this->criarTecnico('outro@reparos.test')));

        $this->getJson('/api/equipamentos')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.cliente.nome', 'Ana Souza')
            ->assertJsonPath('0.ordens_servico_count', 1)
            ->assertJsonPath('1.cliente.nome', 'Bruno');

        $this->getJson("/api/equipamentos?cliente_id={$bruno->id}")
            ->assertJsonCount(1)
            ->assertJsonPath('0.modelo', 'Xbox Series S');
    }

    public function test_busca_por_modelo_numero_de_serie_ou_nome_do_cliente(): void
    {
        $this->criarEquipamento($this->cliente, ['numero_serie' => 'ABC123XYZ']);
        $bruno = $this->criarCliente($this->tecnico, ['nome' => 'Bruno Lima', 'telefone_whatsapp' => '11911111111']);
        $this->criarEquipamento($bruno, ['tipo' => 'Smartphone', 'marca' => 'Motorola', 'modelo' => 'Moto G84']);

        $this->getJson('/api/equipamentos?busca=moto')
            ->assertJsonCount(1)
            ->assertJsonPath('0.modelo', 'Moto G84');

        $this->getJson('/api/equipamentos?busca=abc123')
            ->assertJsonCount(1)
            ->assertJsonPath('0.modelo', 'Inspiron 15');

        $this->getJson('/api/equipamentos?busca=bruno')
            ->assertJsonCount(1)
            ->assertJsonPath('0.cliente.nome', 'Bruno Lima');
    }

    public function test_ficha_traz_cliente_e_ordens(): void
    {
        $equipamento = $this->criarEquipamento($this->cliente);
        $equipamento->ordensServico()->create(['problema_relatado' => 'Tela piscando']);

        $this->getJson("/api/equipamentos/{$equipamento->id}")
            ->assertOk()
            ->assertJsonPath('cliente.nome', 'Ana Souza')
            ->assertJsonPath('ordens_servico.0.problema_relatado', 'Tela piscando');
    }

    public function test_edita_equipamento_sem_trocar_de_cliente(): void
    {
        $equipamento = $this->criarEquipamento($this->cliente);
        $outro = $this->criarCliente($this->tecnico, ['nome' => 'Bruno', 'telefone_whatsapp' => '11911111111']);

        $this->putJson("/api/equipamentos/{$equipamento->id}", [
            'cliente_id' => $outro->id,
            'tipo' => 'Notebook',
            'marca' => 'Dell',
            'modelo' => 'Inspiron 15 3000',
            'numero_serie' => 'SN-998',
        ])
            ->assertOk()
            ->assertJson(['modelo' => 'Inspiron 15 3000', 'numero_serie' => 'SN-998', 'cliente_id' => $this->cliente->id]);
    }

    public function test_nao_acessa_equipamento_de_outro_tecnico(): void
    {
        $alheio = $this->criarEquipamento($this->criarCliente($this->criarTecnico('outro@reparos.test')));

        $this->getJson("/api/equipamentos/{$alheio->id}")->assertNotFound();

        $this->putJson("/api/equipamentos/{$alheio->id}", [
            'tipo' => 'Tablet',
            'marca' => 'Invasor',
            'modelo' => 'X',
        ])->assertNotFound();

        $this->assertDatabaseHas('equipamentos', ['id' => $alheio->id, 'marca' => 'Dell']);
    }
}
