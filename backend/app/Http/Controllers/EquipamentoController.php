<?php

namespace App\Http\Controllers;

use App\Http\Requests\EquipamentoRequest;
use App\Models\Equipamento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Equipamentos dos clientes do técnico logado: listagem com busca, cadastro, ficha e edição.
 * Cada técnico só enxerga os equipamentos dos próprios clientes.
 */
class EquipamentoController extends Controller
{
    /**
     * Filtros opcionais: `cliente_id` e `busca` (tipo, marca, modelo, número de série ou nome do cliente).
     */
    public function index(Request $request): JsonResponse
    {
        $busca = trim((string) $request->query('busca', ''));

        $equipamentos = Equipamento::query()
            ->select('equipamentos.*')
            ->join('clientes', 'clientes.id', '=', 'equipamentos.cliente_id')
            ->where('clientes.tecnico_id', $request->user()->id)
            ->when($request->filled('cliente_id'), fn ($query) => $query->where('equipamentos.cliente_id', (int) $request->query('cliente_id')))
            ->when($busca !== '', function ($query) use ($busca) {
                $query->where(function ($query) use ($busca) {
                    foreach (['equipamentos.tipo', 'equipamentos.marca', 'equipamentos.modelo', 'equipamentos.numero_serie', 'clientes.nome'] as $coluna) {
                        $query->orWhere($coluna, 'ilike', '%'.$busca.'%');
                    }
                });
            })
            ->with('cliente:id,nome,telefone_whatsapp')
            ->withCount('ordensServico')
            ->orderBy('clientes.nome')
            ->orderBy('equipamentos.id')
            ->get();

        return response()->json($equipamentos);
    }

    public function store(EquipamentoRequest $request): JsonResponse
    {
        $equipamento = Equipamento::create($request->validated());

        return response()->json($equipamento->load('cliente:id,nome,telefone_whatsapp'), 201);
    }

    /**
     * Ficha do equipamento com o cliente e as OS, da mais recente para a mais antiga.
     */
    public function show(Request $request, Equipamento $equipamento): JsonResponse
    {
        $this->garantirDono($request, $equipamento);

        $equipamento->load([
            'cliente:id,nome,telefone_whatsapp,endereco',
            'ordensServico' => fn ($query) => $query->latest('data_abertura'),
        ]);

        return response()->json($equipamento);
    }

    public function update(EquipamentoRequest $request, Equipamento $equipamento): JsonResponse
    {
        $equipamento->update($request->validated());

        return response()->json($equipamento->load('cliente:id,nome,telefone_whatsapp'));
    }

    /**
     * Equipamento de cliente de outro técnico responde como se não existisse.
     */
    private function garantirDono(Request $request, Equipamento $equipamento): void
    {
        abort_unless($equipamento->cliente->tecnico_id === $request->user()->id, 404, 'Equipamento não encontrado.');
    }
}
