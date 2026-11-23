<?php

namespace App\Http\Controllers;

use App\Http\Requests\CadastroRequest;
use App\Http\Requests\NovaSenhaRequest;
use App\Models\Usuario;
use App\Support\Auditoria;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Acesso dos usuários da assistência por token (Laravel Sanctum): login, cadastro e recuperação de senha.
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Informe o e-mail.',
            'email.email' => 'Informe um e-mail válido.',
            'password.required' => 'Informe a senha.',
        ]);

        $usuario = Usuario::where('email', mb_strtolower(trim($dados['email'])))->first();

        if (! $usuario || ! Hash::check($dados['password'], $usuario->password)) {
            // Tentativa sem usuário certo não tem assistência: fica só no log da aplicação.
            Log::notice('Login recusado', ['email' => mb_strtolower(trim($dados['email'])), 'ip' => $request->ip()]);

            throw ValidationException::withMessages([
                'email' => 'E-mail ou senha incorretos.',
            ]);
        }

        // A senha confere, mas o admin desativou o acesso.
        if (! $usuario->ativo) {
            throw ValidationException::withMessages([
                'email' => 'Este acesso foi desativado. Fale com o administrador da assistência.',
            ]);
        }

        $usuario->forceFill(['ultimo_acesso_em' => now()])->save();
        Auditoria::registrar($usuario->assistencia_id, 'entrou', 'usuario', $usuario->id, "{$usuario->nome} entrou no sistema", usuario: $usuario);

        return $this->respostaComToken($usuario);
    }

    /**
     * Cria a conta da assistência com o primeiro usuário, que é admin, grava o aceite dos termos e já entra com ele.
     */
    public function cadastro(CadastroRequest $request): JsonResponse
    {
        $usuario = DB::transaction(function () use ($request) {
            $usuario = Usuario::criarComAssistencia($request->validated());
            $usuario->forceFill(['ultimo_acesso_em' => now()])->save();
            Auditoria::registrar($usuario->assistencia_id, 'criou', 'assistencia', $usuario->assistencia_id,
                "Criou a conta da assistência {$usuario->assistencia->nome}", usuario: $usuario);

            // A conta só nasce com o aceite dos Termos de uso e da Política de privacidade (validado no CadastroRequest).
            $usuario->registrarAceiteTermos($request);

            return $usuario;
        });

        return $this->respostaComToken($usuario, 201);
    }

    /**
     * Envia o link de nova senha. A resposta é a mesma com ou sem conta para o e-mail,
     * para não revelar quais e-mails estão cadastrados.
     */
    public function esqueciSenha(Request $request): JsonResponse
    {
        $dados = $request->validate(['email' => ['required', 'email']], [
            'email.required' => 'Informe o e-mail.',
            'email.email' => 'Informe um e-mail válido.',
        ]);

        Password::sendResetLink(['email' => mb_strtolower(trim($dados['email']))]);

        return response()->json(['message' => 'Se houver uma conta com este e-mail, o link foi enviado.']);
    }

    public function redefinirSenha(NovaSenhaRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (Usuario $usuario, string $senha) use ($request) {
                $usuario->forceFill([
                    'password' => $senha,
                    'remember_token' => Str::random(60),
                ])->save();

                // Por padrão encerra as sessões abertas em outros dispositivos.
                if ($request->boolean('sair_outros', true)) {
                    $usuario->tokens()->delete();
                }

                Auditoria::registrar($usuario->assistencia_id, 'redefiniu_senha', 'usuario', $usuario->id,
                    "{$usuario->nome} criou uma nova senha pelo link do e-mail", usuario: $usuario);

                event(new PasswordReset($usuario));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => 'Link de recuperação inválido ou expirado. Peça um novo link.',
            ]);
        }

        return response()->json(['message' => 'Senha alterada.']);
    }

    public function eu(Request $request): JsonResponse
    {
        return response()->json($request->user()->paraSessao());
    }

    public function logout(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $usuario->currentAccessToken()->delete();
        Auditoria::registrar($usuario->assistencia_id, 'saiu', 'usuario', $usuario->id, "{$usuario->nome} saiu do sistema");

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    private function respostaComToken(Usuario $usuario, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $usuario->createToken('frontend')->plainTextToken,
            // termos_pendentes = true: o frontend pede o aceite antes de abrir o sistema.
            'usuario' => $usuario->paraSessao(),
            'expira_em_minutos' => config('auth.sessao_minutos'),
        ], $status);
    }
}
