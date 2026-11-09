<?php

namespace App\Http\Controllers;

use App\Http\Requests\CadastroRequest;
use App\Http\Requests\NovaSenhaRequest;
use App\Models\Tecnico;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Acesso do técnico por token (Laravel Sanctum): login, cadastro e recuperação de senha.
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

        $tecnico = Tecnico::where('email', mb_strtolower(trim($dados['email'])))->first();

        if (! $tecnico || ! Hash::check($dados['password'], $tecnico->password)) {
            throw ValidationException::withMessages([
                'email' => 'E-mail ou senha incorretos.',
            ]);
        }

        return $this->respostaComToken($tecnico);
    }

    /**
     * Cria a conta da assistência e já entra com ela.
     */
    public function cadastro(CadastroRequest $request): JsonResponse
    {
        $tecnico = Tecnico::create($request->validated());

        return $this->respostaComToken($tecnico, 201);
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
            function (Tecnico $tecnico, string $senha) use ($request) {
                $tecnico->forceFill([
                    'password' => $senha,
                    'remember_token' => Str::random(60),
                ])->save();

                // Por padrão encerra as sessões abertas em outros dispositivos.
                if ($request->boolean('sair_outros', true)) {
                    $tecnico->tokens()->delete();
                }

                event(new PasswordReset($tecnico));
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
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    private function respostaComToken(Tecnico $tecnico, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $tecnico->createToken('frontend')->plainTextToken,
            'tecnico' => $tecnico,
            'expira_em_minutos' => config('auth.sessao_minutos'),
        ], $status);
    }
}
