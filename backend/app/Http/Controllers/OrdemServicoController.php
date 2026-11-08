<?php

namespace App\Http\Controllers;

use App\Enums\StatusOrdemServico;
use App\Http\Requests\DiagnosticoRequest;
use App\Http\Requests\OrdemServicoRequest;
use App\Http\Requests\RetiradaRequest;
use App\Models\OrdemServico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Ordens de serviço dos clientes do técnico logado: abertura, ficha, edição, retirada e diagnóstico.
 * Cada técnico só enxerga as OS dos próprios clientes.
 */
class OrdemServicoController extends Controller
{
    /**
     * Filtros opcionais: `status`, `equipamento_id` e `cliente_id`. A lista não traz o endereço do cliente.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(StatusOrdemServico::class)],
        ], [
            'status.enum' => 'Status inválido.',
        ]);

        $ordens = OrdemServico::query()
            ->doTecnico($request->user()->id)
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->when($request->filled('equipamento_id'), fn ($query) => $query->where('equipamento_id', (int) $request->query('equipamento_id')))
            ->when($request->filled('cliente_id'), fn ($query) => $query->whereRelation('equipamento', 'cliente_id', (int) $request->query('cliente_id')))
            ->with('equipamento:id,cliente_id,tipo,marca,modelo', 'equipamento.cliente:id,nome')
            ->latest('data_abertura')
            ->orderByDesc('id')
            ->get();

        return response()->json($ordens);
    }

    /**
     * Abre a OS com o problema relatado; ela nasce "Aberta", com número e o primeiro registro no histórico (RF07).
     */
    public function store(OrdemServicoRequest $request): JsonResponse
    {
        $os = OrdemServico::create($request->validated());

        return response()->json($this->ficha($os), 201);
    }

    /**
     * Ficha da OS com equipamento, cliente, orçamento e histórico em ordem cronológica (RF22, RF25).
     */
    public function show(Request $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_unless($ordemServico->pertenceA($request->user()), 404, 'OS não encontrada.');

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Problema relatado e retirada combinada só mudam antes do diagnóstico (RF08).
     */
    public function update(OrdemServicoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_unless(
            in_array($ordemServico->status, [StatusOrdemServico::Aberta, StatusOrdemServico::AguardandoDiagnostico], true),
            422,
            'A OS só pode ser editada antes do diagnóstico.',
        );

        $ordemServico->update($request->validated());

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * O técnico retirou o equipamento: "Aberta" → "Aguardando diagnóstico" (RF09).
     */
    public function retirada(RetiradaRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        DB::transaction(function () use ($request, $ordemServico) {
            $ordemServico->mudarStatus(
                StatusOrdemServico::AguardandoDiagnostico,
                $request->validated('observacao') ?: 'Equipamento retirado',
            );
            $ordemServico->update(['data_retirada' => $request->validated('data_retirada') ?? now()]);
        });

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Registra o diagnóstico: "Aguardando diagnóstico" → "Diagnóstico realizado" (RF10).
     * Enquanto o orçamento não sai, o texto ainda pode ser corrigido sem nova mudança de status.
     */
    public function diagnostico(DiagnosticoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        DB::transaction(function () use ($request, $ordemServico) {
            if ($ordemServico->status !== StatusOrdemServico::DiagnosticoRealizado) {
                $ordemServico->mudarStatus(StatusOrdemServico::DiagnosticoRealizado);
            }
            $ordemServico->update($request->validated());
        });

        return response()->json($this->ficha($ordemServico));
    }

    private function ficha(OrdemServico $os): OrdemServico
    {
        return $os->refresh()->load([
            'equipamento:id,cliente_id,tipo,marca,modelo,numero_serie',
            'equipamento.cliente:id,nome,telefone_whatsapp',
            'orcamento.itens',
            'historico',
        ]);
    }
}
