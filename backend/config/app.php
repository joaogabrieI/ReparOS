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

];
