<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Endpoint simples para o frontend conferir se a API e o banco estão no ar.
 */
class StatusController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $banco = 'conectado';
        } catch (Throwable) {
            $banco = 'indisponível';
        }

        return response()->json([
            'app' => config('app.name'),
            'banco' => $banco,
        ]);
    }
}
