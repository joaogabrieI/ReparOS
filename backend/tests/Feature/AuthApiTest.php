<?php

namespace Tests\Feature;

use App\Models\Tecnico;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    // Roda no banco local e desfaz tudo ao final de cada teste.
    use DatabaseTransactions;

    private const SENHA = 'Senha@123';

    private function criarTecnico(string $email = 'teste-auth@reparos.test'): Tecnico
    {
        return Tecnico::create([
            'nome' => 'Técnico Teste',
            'nome_assistencia' => 'Assistência Teste',
            'email' => $email,
            'password' => self::SENHA,
        ]);
    }

    private function dadosCadastro(array $dados = []): array
    {
        return $dados + [
            'nome' => 'Marcos',
            'nome_assistencia' => 'MTec Reparos',
            'telefone' => '(11) 4002-8922',
            'email' => 'teste-cadastro@reparos.test',
            'password' => self::SENHA,
            'password_confirmation' => self::SENHA,
        ];
    }

    public function test_login_devolve_token_que_acessa_a_api(): void
    {
        $this->criarTecnico();

        $token = $this->postJson('/api/login', ['email' => 'Teste-Auth@reparos.test', 'password' => self::SENHA])
            ->assertOk()
            ->assertJsonPath('tecnico.email', 'teste-auth@reparos.test')
            ->assertJsonPath('expira_em_minutos', 30)
            ->assertJsonMissingPath('tecnico.password')
            ->json('token');

        $this->withToken($token)->getJson('/api/eu')->assertOk()->assertJsonPath('email', 'teste-auth@reparos.test');
    }

    public function test_login_recusa_senha_errada(): void
    {
        $this->criarTecnico();

        $this->postJson('/api/login', ['email' => 'teste-auth@reparos.test', 'password' => 'errada'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'E-mail ou senha incorretos.');
    }

    public function test_login_bloqueia_a_sexta_tentativa_no_mesmo_minuto(): void
    {
        $this->criarTecnico();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'teste-auth@reparos.test', 'password' => 'errada'])->assertUnprocessable();
        }

        // Nem a senha certa entra até o minuto passar.
        $this->postJson('/api/login', ['email' => 'teste-auth@reparos.test', 'password' => self::SENHA])
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn ($m) => str_starts_with($m, 'Muitas tentativas de login.'));

        $this->travel(61)->seconds();
        $this->postJson('/api/login', ['email' => 'teste-auth@reparos.test', 'password' => self::SENHA])->assertOk();
    }

    public function test_logout_invalida_o_token(): void
    {
        $token = $this->criarTecnico()->createToken('frontend')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/eu')->assertUnauthorized();
    }

    public function test_sessao_expira_apos_30_minutos_sem_uso(): void
    {
        $token = $this->criarTecnico()->createToken('frontend')->plainTextToken;

        // Usar a API renova o prazo.
        $this->travel(25)->minutes();
        $this->withToken($token)->getJson('/api/eu')->assertOk();
        $this->travel(25)->minutes();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/eu')->assertOk();

        $this->travel(31)->minutes();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/eu')->assertUnauthorized();
    }

    public function test_token_so_ve_os_clientes_do_proprio_tecnico(): void
    {
        $outro = $this->criarTecnico('teste-auth-outro@reparos.test');
        $doOutro = $outro->clientes()->create(['nome' => 'Cliente do outro', 'telefone_whatsapp' => '11977776666', 'endereco' => 'Rua B, 2']);
        $token = $this->criarTecnico()->createToken('frontend')->plainTextToken;

        $this->withToken($token)->getJson('/api/clientes')->assertOk()->assertJsonMissing(['id' => $doOutro->id]);
        $this->withToken($token)->getJson("/api/clientes/{$doOutro->id}")->assertNotFound();
    }

    public function test_cadastro_cria_a_conta_com_senha_em_bcrypt_e_ja_entra(): void
    {
        $token = $this->postJson('/api/cadastro', $this->dadosCadastro(['email' => ' Teste-Cadastro@reparos.test ']))
            ->assertCreated()
            ->assertJsonPath('tecnico.email', 'teste-cadastro@reparos.test')
            ->assertJsonPath('tecnico.telefone', '1140028922')
            ->json('token');

        $tecnico = Tecnico::where('email', 'teste-cadastro@reparos.test')->firstOrFail();
        $this->assertStringStartsWith('$2y$', $tecnico->password);
        $this->assertTrue(Hash::check(self::SENHA, $tecnico->password));

        $this->withToken($token)->getJson('/api/eu')->assertOk()->assertJsonPath('nome_assistencia', 'MTec Reparos');
    }

    public function test_cadastro_exige_senha_com_letra_numero_e_caractere_especial(): void
    {
        $casos = [
            'Ab@1' => 'A senha precisa ter pelo menos 8 caracteres.',
            '12345678@' => 'A senha precisa ter pelo menos uma letra.',
            'Senhaaaa@' => 'A senha precisa ter pelo menos um número.',
            'Senha1234' => 'A senha precisa ter pelo menos um caractere especial.',
        ];

        foreach ($casos as $senha => $mensagem) {
            $this->postJson('/api/cadastro', $this->dadosCadastro(['password' => $senha, 'password_confirmation' => $senha]))
                ->assertUnprocessable()
                ->assertJsonPath('errors.password', fn ($erros) => in_array($mensagem, $erros));
        }

        $this->postJson('/api/cadastro', $this->dadosCadastro(['password_confirmation' => 'Outra@123']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.password.0', 'As senhas não coincidem.');
    }

    public function test_cadastro_recusa_email_ja_usado_e_campos_vazios(): void
    {
        $this->criarTecnico('teste-cadastro@reparos.test');

        $this->postJson('/api/cadastro', $this->dadosCadastro())
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Já existe uma conta com este e-mail.');

        $this->postJson('/api/cadastro', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nome', 'nome_assistencia', 'telefone', 'email', 'password']);
    }

    public function test_esqueci_senha_envia_link_para_a_tela_de_nova_senha(): void
    {
        Notification::fake();
        $tecnico = $this->criarTecnico();

        $this->postJson('/api/senha/esqueci', ['email' => 'teste-auth@reparos.test'])->assertOk();

        Notification::assertSentTo($tecnico, ResetPassword::class, function (ResetPassword $aviso) use ($tecnico) {
            $link = $aviso->toMail($tecnico)->actionUrl;

            return str_contains($link, '/#/nova-senha?token='.$aviso->token) && str_contains($link, 'email=teste-auth%40reparos.test');
        });
    }

    public function test_esqueci_senha_responde_igual_para_email_sem_conta(): void
    {
        Notification::fake();

        $this->postJson('/api/senha/esqueci', ['email' => 'ninguem@reparos.test'])
            ->assertOk()
            ->assertJsonPath('message', 'Se houver uma conta com este e-mail, o link foi enviado.');

        Notification::assertNothingSent();
    }

    public function test_redefinir_senha_troca_a_senha_e_encerra_as_sessoes(): void
    {
        $tecnico = $this->criarTecnico();
        $tecnico->createToken('frontend');
        $token = Password::createToken($tecnico);

        $this->postJson('/api/senha/redefinir', [
            'token' => $token,
            'email' => 'teste-auth@reparos.test',
            'password' => 'Nova#Senha9',
            'password_confirmation' => 'Nova#Senha9',
        ])->assertOk();

        $this->assertTrue(Hash::check('Nova#Senha9', $tecnico->fresh()->password));
        $this->assertSame(0, $tecnico->tokens()->count());

        // O link só vale uma vez.
        $this->postJson('/api/senha/redefinir', [
            'token' => $token,
            'email' => 'teste-auth@reparos.test',
            'password' => 'Outra#Senha9',
            'password_confirmation' => 'Outra#Senha9',
        ])->assertUnprocessable()->assertJsonPath('errors.email.0', 'Link de recuperação inválido ou expirado. Peça um novo link.');
    }

    public function test_redefinir_senha_valida_a_nova_senha(): void
    {
        $tecnico = $this->criarTecnico();

        $this->postJson('/api/senha/redefinir', [
            'token' => Password::createToken($tecnico),
            'email' => 'teste-auth@reparos.test',
            'password' => 'semnumero!',
            'password_confirmation' => 'semnumero!',
        ])->assertUnprocessable()->assertJsonPath('errors.password.0', 'A senha precisa ter pelo menos um número.');

        $this->assertTrue(Hash::check(self::SENHA, $tecnico->fresh()->password));
    }
}
