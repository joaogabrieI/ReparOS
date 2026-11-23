<?php

namespace App\Http\Middleware;

use App\Models\AceiteTermos;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enquanto o usuário logado não aceitar as versões em vigor dos Termos de uso e da Política de
 * privacidade (primeiro acesso de quem o admin criou ou texto em nova versão), a API recusa as rotas
 * do sistema com 403 e o código "termos_pendentes". Ficam livres só as rotas de aceite, logout e /eu
 * (ver routes/api.php), para o frontend mostrar a tela de aceite.
 */
class ExigeAceiteTermos
{
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if ($usuario && $usuario->termosPendentes()) {
            return response()->json([
                'message' => 'Para continuar, aceite os Termos de uso e a Política de privacidade.',
                'codigo' => 'termos_pendentes',
                'versoes' => AceiteTermos::versoesAtuais(),
            ], 403);
        }

        return $next($request);
    }
}
