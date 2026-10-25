<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | No ReparOS quem faz login é o Técnico (dono da assistência). O Cliente
    | acompanha a OS sem conta própria, então não existe a tabela "users".
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'tecnicos'),
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'tecnicos',
        ],
    ],

    'providers' => [
        'tecnicos' => [
            'driver' => 'eloquent',
            'model' => App\Models\Tecnico::class,
        ],
    ],

    'passwords' => [
        'tecnicos' => [
            'provider' => 'tecnicos',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
