<?php

namespace App\Support;

/**
 * Endereço de uma tela do frontend React. A base vem de FRONTEND_URL (a primeira, se houver várias para o CORS);
 * as telas usam navegação por hash (#/...).
 */
class LinkFrontend
{
    public static function para(string $caminho, array $params = []): string
    {
        $base = rtrim(trim(explode(',', (string) config('app.frontend_url'))[0]), '/');

        return $base.'/#/'.ltrim($caminho, '/').($params ? '?'.http_build_query($params) : '');
    }
}
