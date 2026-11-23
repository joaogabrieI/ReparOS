<?php

namespace Tests\Feature;

use App\Enums\PerfilUsuario;
use App\Enums\StatusOrdemServico;
use App\Models\OrdemServico;
use App\Models\RegistroAtividade;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Tests\TestCase;

/**
 * Vários usuários por assistência: o admin gerencia a equipe, a assistência nunca fica sem admin ativo
 * e cada ação fica no registro de atividade.
 */
class UsuarioApiTest extends TestCase
{
    use DatabaseTransactions;

    private const SENHA = 'Senha@123';

    private Usuario $admin;

    private int $clientesCriados = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Usuario::criarComAssistencia([
            'nome' => 'Admin Teste',
            'nome_assistencia' => 'Assistência Teste',
            'telefone' => '11900000000',
            'email' => 'teste-admin@reparos.test',
            'password' => self::SENHA,
        ]);
    }

    private function criarUsuario(string $email, PerfilUsuario $perfil = PerfilUsuario::Tecnico, ?Usuario $da = null): Usuario
    {
        return ($da ?? $this->admin)->assistencia->usuarios()->create([
            'nome' => 'Usuário '.$email,
            'email' => $email,
            'password' => self::SENHA,
            'perfil' => $perfil,
        ]);
    }

    private function dadosUsuario(array $dados = []): array
    {
        return $dados + [
            'nome' => ' Bruno Técnico ',
            'email' => ' Teste-Bruno@Reparos.test ',
            'perfil' => 'tecnico',
            'password' => 'Bruno#123',
            'password_confirmation' => 'Bruno#123',
        ];
    }

    public function test_admin_cria_usuario_na_mesma_assistencia_e_ele_entra(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/usuarios', $this->dadosUsuario())
            ->assertCreated()
            ->assertJsonPath('nome', 'Bruno Técnico')
            ->assertJsonPath('email', 'teste-bruno@reparos.test')
            ->assertJsonPath('perfil', 'tecnico')
            ->assertJsonPath('ativo', true)
            ->assertJsonMissingPath('password');

        $novo = Usuario::where('email', 'teste-bruno@reparos.test')->firstOrFail();
        $this->assertSame($this->admin->assistencia_id, $novo->assistencia_id);

        $this->assertDatabaseHas('registros_atividade', [
            'assistencia_id' => $this->admin->assistencia_id,
            'usuario_id' => $this->admin->id,
            'acao' => 'criou_usuario',
            'entidade_id' => $novo->id,
        ]);
        $this->assertStringNotContainsString('Bruno#123', RegistroAtividade::where('acao', 'criou_usuario')->latest('id')->first()->toJson());

        $this->postJson('/api/login', ['email' => 'teste-bruno@reparos.test', 'password' => 'Bruno#123'])
            ->assertOk()
            ->assertJsonPath('usuario.perfil', 'tecnico')
            ->assertJsonPath('usuario.assistencia.nome', 'Assistência Teste');
    }

    public function test_usuarios_da_mesma_assistencia_veem_os_mesmos_clientes(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        $this->admin->clientes()->create(['nome' => 'Cliente do admin', 'telefone_whatsapp' => '11911111111', 'endereco' => 'Rua A']);

        $outraAssistencia = Usuario::criarComAssistencia([
            'nome' => 'Outro', 'nome_assistencia' => 'Outra', 'email' => 'teste-outra@reparos.test', 'password' => self::SENHA,
        ]);
        $outraAssistencia->clientes()->create(['nome' => 'Cliente de fora', 'telefone_whatsapp' => '11922222222', 'endereco' => 'Rua B']);

        Sanctum::actingAs($tecnico);

        $this->getJson('/api/clientes')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.nome', 'Cliente do admin');
    }

    public function test_tecnico_nao_gerencia_usuarios_nem_ve_o_registro_de_atividade(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        Sanctum::actingAs($tecnico);

        $this->getJson('/api/usuarios')->assertOk()->assertJsonCount(2);
        $this->postJson('/api/usuarios', $this->dadosUsuario())->assertForbidden();
        $this->putJson("/api/usuarios/{$this->admin->id}", $this->dadosUsuario())->assertForbidden();
        $this->postJson("/api/usuarios/{$this->admin->id}/desativar")->assertForbidden();
        $this->putJson('/api/assistencia', ['nome' => 'X', 'telefone' => '11900000000', 'dias_limite_parada' => 5])->assertForbidden();
        $this->getJson('/api/atividades')->assertForbidden();
    }

    public function test_pode_haver_varios_admins_mas_o_ultimo_admin_ativo_nao_sai(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/usuarios/{$this->admin->id}/desativar")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Não é possível desativar o último admin ativo da assistência.');
        $this->putJson("/api/usuarios/{$this->admin->id}", $this->dadosUsuario(['email' => $this->admin->email, 'perfil' => 'tecnico', 'password' => '']))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Não é possível tirar o perfil de administrador do último admin ativo.');

        $segundo = $this->criarUsuario('teste-admin2@reparos.test', PerfilUsuario::Admin);

        $this->postJson("/api/usuarios/{$this->admin->id}/desativar")->assertOk()->assertJsonPath('ativo', false);
        $this->assertTrue($segundo->fresh()->ativo);
    }

    public function test_desativar_encerra_as_sessoes_e_bloqueia_o_login(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        $tokenTecnico = $tecnico->createToken('frontend')->plainTextToken;
        $tokenAdmin = $this->admin->createToken('frontend')->plainTextToken;

        $this->withToken($tokenAdmin)->postJson("/api/usuarios/{$tecnico->id}/desativar")->assertOk();

        $this->assertSame(0, $tecnico->tokens()->count());
        $this->app['auth']->forgetGuards();
        $this->withToken($tokenTecnico)->getJson('/api/eu')->assertUnauthorized();

        $this->postJson('/api/login', ['email' => 'teste-tec@reparos.test', 'password' => self::SENHA])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Este acesso foi desativado. Fale com o administrador da assistência.']);

        $this->app['auth']->forgetGuards();
        $this->withToken($tokenAdmin)->postJson("/api/usuarios/{$tecnico->id}/reativar")->assertOk()->assertJsonPath('ativo', true);
        $this->postJson('/api/login', ['email' => 'teste-tec@reparos.test', 'password' => self::SENHA])->assertOk();
    }

    /**
     * OS com o responsável informado, já na etapa pedida (montada direto no banco).
     */
    private function criarOs(Usuario $responsavel, StatusOrdemServico $status = StatusOrdemServico::Aberta, bool $retirada = false): OrdemServico
    {
        $equipamento = $this->admin->clientes()
            ->create(['nome' => 'Cliente', 'telefone_whatsapp' => '1198000'.str_pad((string) ++$this->clientesCriados, 4, '0', STR_PAD_LEFT)])
            ->equipamentos()
            ->create(['tipo' => 'Notebook', 'marca' => 'Dell', 'modelo' => 'Inspiron']);

        $os = OrdemServico::create(['equipamento_id' => $equipamento->id, 'problema_relatado' => 'Não liga', 'responsavel_id' => $responsavel->id]);
        $os->forceFill(['status' => $status, 'data_retirada' => $retirada ? now() : null])->save();

        return $os;
    }

    public function test_desativar_transfere_as_os_em_andamento_para_quem_o_admin_escolher(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        $outro = $this->criarUsuario('teste-tec2@reparos.test');
        $emReparo = $this->criarOs($tecnico, StatusOrdemServico::EmReparo, retirada: true);
        $aberta = $this->criarOs($tecnico);
        $canceladaComEquipamento = $this->criarOs($tecnico, StatusOrdemServico::Cancelada, retirada: true);
        $entregue = $this->criarOs($tecnico, StatusOrdemServico::Entregue, retirada: true);
        $canceladaEncerrada = $this->criarOs($tecnico, StatusOrdemServico::Cancelada);
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/usuarios')->assertOk()->assertJsonFragment(['id' => $tecnico->id, 'ordens_em_andamento' => 3]);

        $this->postJson("/api/usuarios/{$tecnico->id}/desativar", ['transferir_para_id' => $outro->id])
            ->assertOk()
            ->assertJsonPath('ativo', false)
            ->assertJsonPath('os_transferidas', 3);

        foreach ([$emReparo, $aberta, $canceladaComEquipamento] as $os) {
            $this->assertSame($outro->id, $os->fresh()->responsavel_id);
            $this->assertDatabaseHas('registros_atividade', [
                'acao' => 'alterou', 'entidade' => 'ordem_servico', 'entidade_id' => $os->id, 'usuario_id' => $this->admin->id,
                'descricao' => "Alterou a OS {$os->numero}. Motivo: transferida para {$outro->nome} ao desativar {$tecnico->nome}",
            ]);
        }
        // Encerradas continuam com quem as atendeu.
        $this->assertSame($tecnico->id, $entregue->fresh()->responsavel_id);
        $this->assertSame($tecnico->id, $canceladaEncerrada->fresh()->responsavel_id);

        $registro = RegistroAtividade::where('acao', 'desativou_usuario')->where('entidade_id', $tecnico->id)->firstOrFail();
        $this->assertSame("Desativou o usuário {$tecnico->nome} e transferiu 3 OS para {$outro->nome}", $registro->descricao);
        $this->assertSame([$emReparo->numero, $aberta->numero, $canceladaComEquipamento->numero], $registro->dados_novos['os_transferidas']);
        $this->assertSame($outro->id, $registro->dados_novos['transferidas_para_id']);

        // O novo responsável já consegue mexer na OS.
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($outro);
        $this->putJson("/api/ordens-servico/{$aberta->id}", ['problema_relatado' => 'Não liga nem carrega'])->assertOk();
    }

    public function test_sem_destino_a_desativacao_de_quem_tem_os_em_andamento_e_recusada(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        $os = $this->criarOs($tecnico, StatusOrdemServico::AguardandoDiagnostico, retirada: true);
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/usuarios/{$tecnico->id}/desativar")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['transferir_para_id' => "{$tecnico->nome} é responsável por 1 OS em andamento. Escolha para quem transferir antes de desativar."]);

        $this->assertTrue($tecnico->fresh()->ativo);
        $this->assertSame($tecnico->id, $os->fresh()->responsavel_id);
        $this->assertDatabaseMissing('registros_atividade', ['acao' => 'desativou_usuario', 'entidade_id' => $tecnico->id]);
    }

    public function test_destino_precisa_ser_outro_usuario_ativo_da_mesma_assistencia(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        $inativo = $this->criarUsuario('teste-inativo@reparos.test');
        $inativo->forceFill(['ativo' => false])->save();
        $deFora = Usuario::criarComAssistencia([
            'nome' => 'Outro Admin', 'nome_assistencia' => 'Outra Assistência', 'email' => 'teste-outra@reparos.test', 'password' => self::SENHA,
        ]);
        $os = $this->criarOs($tecnico);
        Sanctum::actingAs($this->admin);

        foreach ([$tecnico->id, $inativo->id, $deFora->id, 999999] as $destino) {
            $this->postJson("/api/usuarios/{$tecnico->id}/desativar", ['transferir_para_id' => $destino])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['transferir_para_id' => 'Escolha outro usuário ativo da assistência para receber as OS.']);
        }

        $this->assertTrue($tecnico->fresh()->ativo);
        $this->assertSame($tecnico->id, $os->fresh()->responsavel_id);
    }

    public function test_quem_nao_tem_os_em_andamento_e_desativado_sem_escolher_destino(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        $this->criarOs($tecnico, StatusOrdemServico::Entregue, retirada: true);
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/usuarios/{$tecnico->id}/desativar")
            ->assertOk()
            ->assertJsonPath('ativo', false)
            ->assertJsonPath('os_transferidas', 0);

        $this->assertDatabaseHas('registros_atividade', ['acao' => 'desativou_usuario', 'entidade_id' => $tecnico->id, 'descricao' => "Desativou o usuário {$tecnico->nome}"]);
    }

    public function test_admin_edita_usuario_e_troca_a_senha(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        $tecnico->createToken('frontend');
        Sanctum::actingAs($this->admin);

        $this->putJson("/api/usuarios/{$tecnico->id}", $this->dadosUsuario(['email' => 'teste-tec@reparos.test', 'perfil' => 'admin']))
            ->assertOk()
            ->assertJsonPath('perfil', 'admin')
            ->assertJsonPath('nome', 'Bruno Técnico');

        $this->assertSame(0, $tecnico->tokens()->count());
        $this->assertDatabaseHas('registros_atividade', ['acao' => 'alterou_usuario', 'entidade_id' => $tecnico->id]);
    }

    public function test_nao_mexe_em_usuario_de_outra_assistencia(): void
    {
        $outro = Usuario::criarComAssistencia([
            'nome' => 'Outro', 'nome_assistencia' => 'Outra', 'email' => 'teste-outra@reparos.test', 'password' => self::SENHA,
        ]);
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/usuarios/{$outro->id}/desativar")->assertNotFound();
        $this->putJson("/api/usuarios/{$outro->id}", $this->dadosUsuario())->assertNotFound();
        $this->getJson('/api/usuarios')->assertJsonMissing(['email' => 'teste-outra@reparos.test']);
    }

    public function test_admin_altera_as_configuracoes_da_assistencia(): void
    {
        Sanctum::actingAs($this->admin);

        $this->putJson('/api/assistencia', ['nome' => ' MTec ', 'telefone' => '(11) 4002-8922', 'dias_limite_parada' => 5])
            ->assertOk()
            ->assertJsonPath('nome', 'MTec')
            ->assertJsonPath('telefone', '1140028922')
            ->assertJsonPath('dias_limite_parada', 5);

        $this->assertDatabaseHas('registros_atividade', ['acao' => 'alterou', 'entidade' => 'assistencia']);
    }

    public function test_registro_de_atividade_filtra_por_usuario_e_acao_e_nao_pode_ser_alterado(): void
    {
        $tecnico = $this->criarUsuario('teste-tec@reparos.test');
        Sanctum::actingAs($tecnico);
        $this->postJson('/api/clientes', ['nome' => 'Ana', 'telefone_whatsapp' => '11933334444', 'endereco' => 'Rua C'])->assertCreated();

        Sanctum::actingAs($this->admin);
        $this->getJson("/api/atividades?usuario_id={$tecnico->id}&acao=criou")
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.entidade', 'cliente')
            ->assertJsonPath('data.0.usuario.nome', $tecnico->nome)
            ->assertJsonPath('data.0.descricao', 'Criou o cliente Ana');

        $registro = RegistroAtividade::where('usuario_id', $tecnico->id)->firstOrFail();
        $this->expectException(LogicException::class);
        $registro->update(['descricao' => 'outra coisa']);
    }
}
