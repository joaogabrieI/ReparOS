<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Alterações na OS: só o técnico responsável ou um admin (ver ExigeResponsavelDaOs).
        $middleware->alias([
            'responsavel.os' => \App\Http\Middleware\ExigeResponsavelDaOs::class,
            // Sem o aceite das versões atuais dos termos, a API recusa as rotas do sistema (ver ExigeAceiteTermos).
            'termos.aceitos' => \App\Http\Middleware\ExigeAceiteTermos::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // A API sempre responde erros em JSON.
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*'));
    })->create();
