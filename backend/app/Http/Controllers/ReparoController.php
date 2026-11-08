<?php

namespace App\Http\Controllers;

use App\Enums\StatusOrdemServico;
use App\Http\Requests\EntregaRequest;
use App\Http\Requests\ProntoRequest;
use App\Http\Requests\ReparoRequest;
use App\Models\OrdemServico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Fim do fluxo da OS: anotações do reparo, OS pronta, entrega e consulta do histórico (RF13 a RF15, RF25).
 */
class ReparoController extends Controller
{
    /**
     * Registra o serviço executado e as peças trocadas (RF13). Só durante o reparo; pode ser corrigido
     * quantas vezes for preciso até a OS ficar pronta, sem mudar o status.
     */
    public function reparo(ReparoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_unless(
            $ordemServico->status === StatusOrdemServico::EmReparo,
            422,
            'O serviço executado só pode ser registrado enquanto a OS está em reparo.',
        );

        $ordemServico->update($request->validated());

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * "Em reparo" → "Pronto para retirada" (RF14). Exige o serviço executado registrado, para a OS
     * nunca ficar pronta sem dizer o que foi feito.
     */
    public function pronto(ProntoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_if(
            $ordemServico->status === StatusOrdemServico::EmReparo && blank($ordemServico->servico_executado),
            422,
            'Registre o serviço executado antes de marcar a OS como pronta.',
        );

        $ordemServico->mudarStatus(
            StatusOrdemServico::ProntoParaRetirada,
            $request->validated('observacao') ?: 'Reparo concluído',
        );

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Entrega do equipamento e encerramento da OS (RF15). Vale para "Pronto para retirada" e também
     * para "Orçamento recusado", quando o equipamento volta ao cliente sem reparo.
     */
    public function entrega(EntregaRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        $semReparo = $ordemServico->status === StatusOrdemServico::OrcamentoRecusado;

        DB::transaction(function () use ($request, $ordemServico, $semReparo) {
            $ordemServico->mudarStatus(
                StatusOrdemServico::Entregue,
                $request->validated('observacao')
                    ?: ($semReparo ? 'Equipamento devolvido sem reparo' : 'Equipamento entregue ao cliente'),
            );
            $ordemServico->update(['data_entrega' => $request->validated('data_entrega') ?? now()]);
        });

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Histórico completo da OS em ordem cronológica (RF17, RF25).
     */
    public function historico(Request $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_unless($ordemServico->pertenceA($request->user()), 404, 'OS não encontrada.');

        return response()->json($ordemServico->historico()->get());
    }

    private function ficha(OrdemServico $os): OrdemServico
    {
        return $os->refresh()->load(['orcamento.itens', 'historico']);
    }
}
