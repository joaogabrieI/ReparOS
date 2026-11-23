<?php

namespace App\Http\Controllers;

use App\Models\RegistroAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Registro de atividade da assistência, mais recente primeiro (só admin).
 * Filtros opcionais: `usuario_id`, `acao`, `entidade`, `entidade_id` e período (`de`, `ate`). 50 por página.
 */
class AtividadeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'usuario_id' => ['nullable', 'integer'],
            'entidade_id' => ['nullable', 'integer'],
            'acao' => ['nullable', 'string', 'max:40'],
            'entidade' => ['nullable', 'string', 'max:50'],
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:de'],
        ], [
            'de.date_format' => 'Informe a data inicial no formato aaaa-mm-dd.',
            'ate.date_format' => 'Informe a data final no formato aaaa-mm-dd.',
            'ate.after_or_equal' => 'A data final não pode ser antes da inicial.',
        ]);

        $registros = RegistroAtividade::query()
            ->where('assistencia_id', $request->user()->assistencia_id)
            ->when($request->filled('usuario_id'), fn ($query) => $query->where('usuario_id', (int) $request->query('usuario_id')))
            ->when($request->filled('acao'), fn ($query) => $query->where('acao', $request->query('acao')))
            ->when($request->filled('entidade'), fn ($query) => $query->where('entidade', $request->query('entidade')))
            ->when($request->filled('entidade_id'), fn ($query) => $query->where('entidade_id', (int) $request->query('entidade_id')))
            ->when($request->filled('de'), fn ($query) => $query->where('created_at', '>=', Carbon::parse($request->query('de'))->startOfDay()))
            ->when($request->filled('ate'), fn ($query) => $query->where('created_at', '<=', Carbon::parse($request->query('ate'))->endOfDay()))
            ->with('usuario:id,nome')
            ->latest()
            ->orderByDesc('id')
            ->paginate(50);

        return response()->json($registros);
    }
}
