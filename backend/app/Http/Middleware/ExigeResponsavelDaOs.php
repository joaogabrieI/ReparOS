<?php

namespace App\Http\Middleware;

use App\Models\OrdemServico;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Só o técnico responsável pela OS ou um admin pode alterá-la (status, dados, orçamento, reparo, entrega,
 * voltar etapa e troca do responsável). Os outros usuários da assistência só consultam e recebem 403.
 * OS de outra assistência responde 404, como se não existisse.
 */
class ExigeResponsavelDaOs
{
    public function handle(Request $request, Closure $next): Response
    {
        $os = $request->route('ordemServico');
        $usuario = $request->user();

        if (! $os instanceof OrdemServico || ! $usuario) {
            return $next($request);
        }

        abort_unless($os->pertenceA($usuario), 404, 'OS não encontrada.');
        abort_unless(
            $os->responsavel_id === $usuario->id || $usuario->admin(),
            403,
            'Só o técnico responsável pela OS ou um admin pode alterá-la.',
        );

        return $next($request);
    }
}
