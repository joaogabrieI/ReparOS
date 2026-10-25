<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    |
    | Libera o frontend React (outro endereço/porta) para chamar a API.
    | Os endereços permitidos vêm de FRONTEND_URL no .env, separados por vírgula.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_map('trim', explode(',', env('FRONTEND_URL', 'http://localhost:5173'))),

    // Em desenvolvimento, aceita localhost/127.0.0.1 em qualquer porta
    // (o Vite troca para 5174, 5175... quando a 5173 está ocupada).
    'allowed_origins_patterns' => env('APP_ENV') === 'local'
        ? ['#^http://(localhost|127\\.0\\.0\\.1)(:\\d+)?$#']
        : [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
