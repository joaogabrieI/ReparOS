<?php

use App\Models\Usuario;

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | No ReparOS quem faz login são os usuários da assistência (admin ou
    | técnico). O Cliente acompanha a OS sem conta própria.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'usuarios'),
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'usuarios',
        ],
    ],

    'providers' => [
        'usuarios' => [
            'driver' => 'eloquent',
            'model' => Usuario::class,
        ],
    ],

    'passwords' => [
        'usuarios' => [
            'provider' => 'usuarios',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    | Sessão do usuário: o token expira após este tempo sem uso (minutos).
    */

    'sessao_minutos' => (int) env('SESSAO_MINUTOS', 30),

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
