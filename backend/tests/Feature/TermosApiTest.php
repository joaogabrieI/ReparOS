<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Tests\TestCase;

/**
 * Termos de uso e Política de privacidade: aceite obrigatório no cadastro, aceite no primeiro acesso
 * de quem o admin criou e novo aceite quando a versão muda. O aceite grava versão, data e hora, IP e navegador.
 */
class TermosApiTest extends TestCase
{
    use DatabaseTransactions;

    private const SENHA = 'Senha@123';

    private function dadosCadastro(array $dados = []): array
    {
        return $dados + [
            'nome' => 'Marcos',
            'nome_assistencia' => 'MTec Reparos',
            'telefone' => '(11) 4002-8922',
            'email' => 'teste-termos@reparos.test',
            'password' => self::SENHA,
            'password_confirmation' => self::SENHA,
            'aceite_termos' => true,
            'versao_termos' => config('termos.versao_termos'),
            'versao_privacidade' => config('termos.versao_privacidade'),
        ];
    }

    private function criarAdmin(): Usuario
    {
        $admin = Usuario::criarComAssistencia([
            'nome' => 'Admin Termos',
            'nome_assistencia' => 'Assistência Termos',
            'email' => 'teste-termos-admin@reparos.test',
            'password' => self::SENHA,
        ]);
        $admin->registrarAceiteTermos();

        return $admin;
    }

    public function test_versoes_em_vigor_sao_publicas(): void
    {
        $this->getJson('/api/termos')
            ->assertOk()
            ->assertJsonPath('versao_termos', config('termos.versao_termos'))
            ->assertJsonPath('versao_privacidade', config('termos.versao_privacidade'))
            ->assertJsonPath('vigencia', config('termos.vigencia'));
    }

    public function test_cadastro_sem_aceite_nao_cria_a_conta(): void
    {
        $this->postJson('/api/cadastro', $this->dadosCadastro(['aceite_termos' => false]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.aceite_termos.0', 'Para continuar, aceite os Termos de uso e a Política de privacidade.');

        $semCampos = $this->dadosCadastro();
        unset($semCampos['aceite_termos'], $semCampos['versao_termos'], $semCampos['versao_privacidade']);
        $this->postJson('/api/cadastro', $semCampos)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['aceite_termos', 'versao_termos', 'versao_privacidade']);

        $this->assertDatabaseMissing('usuarios', ['email' => 'teste-termos@reparos.test']);
    }

    public function test_cadastro_recusa_versao_dos_termos_que_nao_esta_em_vigor(): void
    {
        $this->postJson('/api/cadastro', $this->dadosCadastro(['versao_termos' => '0.9']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.versao_termos.0', 'Os termos foram atualizados. Recarregue a página e leia a nova versão.');

        $this->assertDatabaseMissing('usuarios', ['email' => 'teste-termos@reparos.test']);
    }

    public function test_cadastro_grava_versao_data_ip_e_navegador_do_aceite(): void
    {
        $this->freezeSecond();

        $this->withHeader('User-Agent', 'Navegador de teste')
            ->postJson('/api/cadastro', $this->dadosCadastro())
            ->assertCreated()
            ->assertJsonPath('usuario.termos_pendentes', false);

        $usuario = Usuario::where('email', 'teste-termos@reparos.test')->firstOrFail();
        $aceite = $usuario->ultimoAceiteTermos();

        $this->assertSame(config('termos.versao_termos'), $aceite->versao_termos);
        $this->assertSame(config('termos.versao_privacidade'), $aceite->versao_privacidade);
        $this->assertSame('127.0.0.1', $aceite->ip);
        $this->assertSame('Navegador de teste', $aceite->navegador);
        $this->assertTrue($aceite->aceito_em->equalTo(now()));
        $this->assertDatabaseHas('registros_atividade', ['acao' => 'aceitou_termos', 'usuario_id' => $usuario->id]);
    }

    public function test_usuario_criado_pelo_admin_aceita_no_primeiro_acesso(): void
    {
        $admin = $this->criarAdmin();
        Sanctum::actingAs($admin);
        $this->postJson('/api/usuarios', [
            'nome' => 'Bruno', 'email' => 'teste-termos-bruno@reparos.test', 'perfil' => 'tecnico',
            'password' => self::SENHA, 'password_confirmation' => self::SENHA,
        ])->assertCreated();

        // O admin não aceita pelo outro: o novo usuário entra com o aceite pendente.
        $token = $this->postJson('/api/login', ['email' => 'teste-termos-bruno@reparos.test', 'password' => self::SENHA])
            ->assertOk()
            ->assertJsonPath('usuario.termos_pendentes', true)
            ->assertJsonPath('usuario.termos_atualizados', false)
            ->json('token');

        $this->withToken($token)->postJson('/api/termos/aceite', ['aceite_termos' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['aceite_termos', 'versao_termos', 'versao_privacidade']);

        $this->withToken($token)->postJson('/api/termos/aceite', [
            'aceite_termos' => true,
            'versao_termos' => config('termos.versao_termos'),
            'versao_privacidade' => config('termos.versao_privacidade'),
        ])->assertCreated()->assertJsonPath('termos_pendentes', false);

        $this->withToken($token)->getJson('/api/eu')->assertOk()->assertJsonPath('termos_pendentes', false);
        $this->withToken($token)->getJson('/api/termos/aceites')->assertOk()->assertJsonCount(1);
    }

    public function test_aceitar_de_novo_a_mesma_versao_nao_duplica_o_registro(): void
    {
        $admin = $this->criarAdmin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/termos/aceite', [
            'aceite_termos' => true,
            'versao_termos' => config('termos.versao_termos'),
            'versao_privacidade' => config('termos.versao_privacidade'),
        ])->assertCreated();

        $this->assertSame(1, $admin->aceitesTermos()->count());
    }

    public function test_nova_versao_da_politica_pede_novo_aceite_e_guarda_os_anteriores(): void
    {
        $admin = $this->criarAdmin();
        Sanctum::actingAs($admin);
        $this->getJson('/api/eu')->assertJsonPath('termos_pendentes', false);

        config(['termos.versao_privacidade' => '2.0']);
        $this->getJson('/api/eu')->assertJsonPath('termos_pendentes', true)->assertJsonPath('termos_atualizados', true);

        $this->postJson('/api/termos/aceite', [
            'aceite_termos' => true,
            'versao_termos' => config('termos.versao_termos'),
            'versao_privacidade' => '2.0',
        ])->assertCreated();

        $this->getJson('/api/eu')->assertJsonPath('termos_pendentes', false);
        $this->assertEqualsCanonicalizing(['1.0', '2.0'], $admin->aceitesTermos()->pluck('versao_privacidade')->all());
    }

    public function test_aceite_nao_pode_ser_alterado_nem_apagado(): void
    {
        $aceite = $this->criarAdmin()->ultimoAceiteTermos();

        try {
            $aceite->update(['versao_termos' => '9.9']);
            $this->fail('O aceite não deveria ser alterado.');
        } catch (LogicException) {
            // esperado
        }

        $this->expectException(LogicException::class);
        $aceite->delete();
    }

    public function test_aceite_exige_login(): void
    {
        $this->postJson('/api/termos/aceite', ['aceite_termos' => true])->assertUnauthorized();
    }
}
