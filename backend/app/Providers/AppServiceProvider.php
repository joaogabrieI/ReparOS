<?php

namespace App\Providers;

use App\Models\Tecnico;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->limitarTentativas();
        $this->expirarSessaoParada();
        $this->configurarLinkDeNovaSenha();
    }

    /**
     * Login: no máximo 5 tentativas por minuto para cada e-mail e endereço IP.
     * Cadastro (10) e recuperação de senha (5): pedidos por minuto por IP.
     */
    private function limitarTentativas(): void
    {
        $muitas = fn (string $acao) => fn (Request $request, array $headers) => response()->json([
            'message' => "Muitas tentativas de {$acao}. Aguarde {$headers['Retry-After']} segundos e tente de novo.",
        ], 429, $headers);

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip())
            ->response($muitas('login')));

        RateLimiter::for('cadastro', fn (Request $request) => Limit::perMinute(10)
            ->by($request->ip())
            ->response($muitas('cadastro')));

        RateLimiter::for('senha', fn (Request $request) => Limit::perMinute(5)
            ->by($request->ip())
            ->response($muitas('recuperação de senha')));
    }

    /**
     * A sessão (token) expira após 30 minutos sem uso; cada pedido à API renova o prazo.
     */
    private function expirarSessaoParada(): void
    {
        Sanctum::authenticateAccessTokensUsing(function (PersonalAccessToken $token, bool $valido) {
            $ultimoUso = $token->last_used_at ?? $token->created_at;

            return $valido && $ultimoUso->gt(now()->subMinutes(config('auth.sessao_minutos')));
        });
    }

    /**
     * O link do e-mail abre a tela de nova senha do frontend.
     */
    private function configurarLinkDeNovaSenha(): void
    {
        ResetPassword::createUrlUsing(function (Tecnico $tecnico, string $token) {
            $frontend = trim(explode(',', config('app.frontend_url'))[0]);

            return $frontend.'/#/nova-senha?'.http_build_query(['token' => $token, 'email' => $tecnico->email]);
        });

        ResetPassword::toMailUsing(fn (Tecnico $tecnico, string $token) => (new MailMessage)
            ->subject('ReparOS: criar nova senha')
            ->greeting("Olá, {$tecnico->nome}!")
            ->line('Recebemos um pedido para criar uma nova senha para a sua conta.')
            ->action('Criar nova senha', call_user_func(ResetPassword::$createUrlCallback, $tecnico, $token))
            ->line('O link vale por '.config('auth.passwords.tecnicos.expire').' minutos.')
            ->line('Se você não pediu, ignore este e-mail: sua senha continua a mesma.'));
    }
}
