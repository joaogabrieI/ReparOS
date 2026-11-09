<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Fuso horário
    |--------------------------------------------------------------------------
    |
    | Horário de Brasília: datas gravadas no banco, "hoje" das OS paradas, prazos
    | e a hora da retirada na mensagem do WhatsApp. A API continua devolvendo as
    | datas em ISO 8601 com o fuso (UTC), então o frontend não muda.
    | As demais opções vêm do padrão do Laravel.
    |
    */

    'timezone' => env('APP_TIMEZONE', 'America/Sao_Paulo'),

    /*
    |--------------------------------------------------------------------------
    | Endereço do frontend
    |--------------------------------------------------------------------------
    |
    | Base dos links que levam a telas do React: acompanhamento da OS na
    | mensagem do WhatsApp e nova senha no e-mail. Com vários endereços
    | (separados por vírgula, para o CORS), vale o primeiro.
    |
    */

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

];
