<?php

namespace App\Http\Controllers;

use App\Http\Requests\AceiteTermosRequest;
use App\Models\AceiteTermos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Termos de uso e Política de privacidade. Os textos ficam no frontend (páginas públicas);
 * aqui ficam as versões em vigor e o registro de quem aceitou, quando e de onde.
 */
class TermosController extends Controller
{
    /**
     * Versões em vigor (rota pública).
     */
    public function versoes(): JsonResponse
    {
        return response()->json(AceiteTermos::versoesAtuais() + ['vigencia' => config('termos.vigencia')]);
    }

    /**
     * Aceite do usuário logado, com as versões atuais.
     */
    public function aceitar(AceiteTermosRequest $request): JsonResponse
    {
        $usuario = $request->user();

        $aceite = $usuario->termosPendentes()
            ? $usuario->registrarAceiteTermos($request)
            : $usuario->ultimoAceiteTermos();

        return response()->json([
            'aceite' => $aceite,
            'termos_pendentes' => false,
        ], 201);
    }

    /**
     * Aceites do próprio usuário (para ele consultar quando e qual versão aceitou).
     */
    public function meus(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->aceitesTermos()->latest('aceito_em')->latest('id')->get()
        );
    }
}
