<?php

namespace Tests\Feature;

use App\Enums\PerfilUsuario;
use App\Models\Equipamento;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Técnico responsável pela OS e autoria de cada mudança de status.
 */
class ResponsavelOsApiTest extends TestCase
{
    use DatabaseTransactions;

    private Usuario $admin;

    private Usuario $tecnico;

    private Equipamento $equipamento;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Usuario::criarComAssistencia([
            'nome' => 'Admin Teste', 'nome_assistencia' => 'Assistência Teste',
            'email' => 'teste-resp-admin@reparos.test', 'password' => 'Senha@123',
        ]);
        $this->tecnico = $this->admin->assistencia->usuarios()->create([
            'nome' => 'Ana Técnica', 'email' => 'teste-resp-tec@reparos.test', 'password' => 'Senha@123', 'perfil' => PerfilUsuario::Tecnico,
        ]);
        $this->equipamento = $this->admin->clientes()
            ->create(['nome' => 'Cliente', 'telefone_whatsapp' => '11988887777', 'endereco' => 'Rua A'])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron']);
    }

    public function test_quem_abre_a_os_fica_responsavel_e_aparece_no_historico(): void
    {
        Sanctum::actingAs($this->tecnico);

        $id = $this->postJson('/api/ordens-servico', ['equipamento_id' => $this->equipamento->id, 'problema_relatado' => 'Não liga'])
            ->assertCreated()
            ->assertJsonPath('responsavel.id', $this->tecnico->id)
            ->assertJsonPath('criado_por.nome', 'Ana Técnica')
            ->assertJsonPath('historico.0.usuario.nome', 'Ana Técnica')
            ->json('id');

        $this->postJson("/api/ordens-servico/{$id}/retirada")
            ->assertOk()
            ->assertJsonPath('historico.1.usuario.nome', 'Ana Técnica');

        $this->assertDatabaseHas('registros_atividade', ['acao' => 'mudou_status', 'entidade_id' => $id, 'usuario_id' => $this->tecnico->id]);
    }

    public function test_abre_a_os_ja_com_outro_responsavel(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/ordens-servico', [
            'equipamento_id' => $this->equipamento->id,
            'problema_relatado' => 'Não liga',
            'responsavel_id' => $this->tecnico->id,
        ])->assertCreated()->assertJsonPath('responsavel.id', $this->tecnico->id);
    }

    public function test_troca_o_responsavel_so_para_usuario_ativo_da_assistencia(): void
    {
        Sanctum::actingAs($this->tecnico);
        $os = $this->equipamento->ordensServico()->create(['problema_relatado' => 'Não liga']);

        $this->putJson("/api/ordens-servico/{$os->id}/responsavel", ['responsavel_id' => $this->admin->id])
            ->assertOk()
            ->assertJsonPath('responsavel.nome', 'Admin Teste');
        $this->assertDatabaseHas('registros_atividade', ['acao' => 'alterou', 'entidade' => 'ordem_servico', 'entidade_id' => $os->id]);

        $inativo = $this->admin->assistencia->usuarios()->create([
            'nome' => 'Saiu', 'email' => 'teste-resp-saiu@reparos.test', 'password' => 'Senha@123', 'ativo' => false,
        ]);
        $deFora = Usuario::criarComAssistencia([
            'nome' => 'Outro', 'nome_assistencia' => 'Outra', 'email' => 'teste-resp-fora@reparos.test', 'password' => 'Senha@123',
        ]);

        // Agora o responsável é o admin: é ele quem pode trocar de novo.
        Sanctum::actingAs($this->admin);
        foreach ([$inativo->id, $deFora->id] as $invalido) {
            $this->putJson("/api/ordens-servico/{$os->id}/responsavel", ['responsavel_id' => $invalido])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['responsavel_id' => 'Escolha um usuário ativo da assistência como responsável.']);
        }

        Sanctum::actingAs($deFora);
        $this->putJson("/api/ordens-servico/{$os->id}/responsavel", ['responsavel_id' => $deFora->id])->assertNotFound();
    }

    public function test_so_o_responsavel_ou_admin_altera_a_os_e_os_outros_so_consultam(): void
    {
        $colega = $this->admin->assistencia->usuarios()->create([
            'nome' => 'Bruno Técnico', 'email' => 'teste-resp-colega@reparos.test', 'password' => 'Senha@123', 'perfil' => PerfilUsuario::Tecnico,
        ]);
        Sanctum::actingAs($this->tecnico);
        $os = $this->equipamento->ordensServico()->create(['problema_relatado' => 'Não liga']);
        $base = "/api/ordens-servico/{$os->id}";

        // Colega da assistência que não é o responsável: consulta, mas não altera nada.
        Sanctum::actingAs($colega);
        $this->getJson($base)->assertOk();
        $this->getJson("{$base}/historico")->assertOk();
        $this->postJson("{$base}/retirada")
            ->assertForbidden()
            ->assertJsonPath('message', 'Só o técnico responsável pela OS ou um admin pode alterá-la.');
        $this->putJson($base, ['problema_relatado' => 'Outro'])->assertForbidden();
        $this->postJson("{$base}/voltar-etapa", ['motivo' => 'Teste'])->assertForbidden();
        $this->putJson("{$base}/orcamento", ['prazo_dias' => 1, 'itens' => []])->assertForbidden();
        $this->postJson("{$base}/entrega")->assertForbidden();
        $this->putJson("{$base}/responsavel", ['responsavel_id' => $colega->id])->assertForbidden();
        $this->assertSame('Não liga', $os->refresh()->problema_relatado);
        $this->assertCount(1, $os->historico);

        // O admin altera mesmo sem ser o responsável, e pode passar a OS para outro técnico.
        Sanctum::actingAs($this->admin);
        $this->postJson("{$base}/retirada")->assertOk();
        $this->putJson("{$base}/responsavel", ['responsavel_id' => $colega->id])->assertOk();

        // O novo responsável passa a alterar; a antiga responsável não.
        Sanctum::actingAs($colega);
        $this->postJson("{$base}/voltar-etapa", ['motivo' => 'Retirada por engano'])->assertOk()->assertJsonPath('status', 'aberta');
        Sanctum::actingAs($this->tecnico);
        $this->postJson("{$base}/retirada")->assertForbidden();
    }

    public function test_lista_filtra_as_minhas_os_e_por_responsavel(): void
    {
        Sanctum::actingAs($this->admin);
        $this->equipamento->ordensServico()->create(['problema_relatado' => 'Do admin']);
        $this->equipamento->ordensServico()->create(['problema_relatado' => 'Da Ana', 'responsavel_id' => $this->tecnico->id]);

        $this->getJson('/api/ordens-servico?minhas=1')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.problema_relatado', 'Do admin');
        $this->getJson("/api/ordens-servico?responsavel_id={$this->tecnico->id}")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.responsavel.nome', 'Ana Técnica');

        Sanctum::actingAs($this->tecnico);
        $this->getJson('/api/ordens-servico')->assertOk()->assertJsonCount(2);
    }
}
