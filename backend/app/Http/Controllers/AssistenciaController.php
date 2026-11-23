<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClienteRequest;
use App\Support\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Configurações da assistência: todos consultam, só o admin altera.
 */
class AssistenciaController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($request->user()->assistencia);
    }

    public function update(Request $request): JsonResponse
    {
        $request->merge([
            'nome' => is_string($request->nome) ? trim($request->nome) : $request->nome,
            'telefone' => is_string($request->telefone) ? ClienteRequest::normalizarTelefone($request->telefone) : $request->telefone,
        ]);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'telefone' => ['required', 'string', 'between:10,11'],
            'dias_limite_parada' => ['required', 'integer', 'between:1,90'],
        ], [
            'nome.required' => 'Informe o nome da assistência.',
            'nome.max' => 'O nome da assistência pode ter no máximo 255 caracteres.',
            'telefone.required' => 'Informe o WhatsApp da loja.',
            'telefone.between' => 'Informe o telefone com DDD, 10 ou 11 dígitos.',
            'dias_limite_parada.required' => 'Informe em quantos dias uma OS é considerada parada.',
            'dias_limite_parada.integer' => 'Informe um número de dias.',
            'dias_limite_parada.between' => 'Informe entre 1 e 90 dias.',
        ]);

        $assistencia = $request->user()->assistencia;
        $antes = $assistencia->only(array_keys($dados));
        $assistencia->update($dados);

        $mudou = $assistencia->getChanges();
        unset($mudou['updated_at']);
        if ($mudou !== []) {
            Auditoria::registrar($assistencia->id, 'alterou', 'assistencia', $assistencia->id,
                'Alterou as configurações da assistência', array_intersect_key($antes, $mudou), $mudou);
        }

        return response()->json($assistencia);
    }
}
