<?php

namespace App\Http\Controllers;

use App\Enums\StatusOrdemServico;
use App\Models\HistoricoStatus;
use App\Models\OrdemServico;
use Illuminate\Http\JsonResponse;

/**
 * Área do cliente, sem login: andamento da OS pelo número que ele recebeu.
 * Mostra só o necessário para acompanhar o reparo; nada de telefone, endereço ou anotações internas do técnico.
 */
class AcompanhamentoController extends Controller
{
    public function __invoke(string $numero): JsonResponse
    {
        $os = OrdemServico::query()
            ->where('numero', strtoupper(trim($numero)))
            ->with('equipamento:id,cliente_id,tipo,marca,modelo', 'equipamento.cliente.tecnico:id,nome_assistencia', 'orcamento', 'historico')
            ->first();

        abort_if($os === null, 404, 'OS não encontrada.');

        $orcamento = $os->orcamento?->data_envio ? $os->orcamento : null;

        return response()->json([
            'numero' => $os->numero,
            'assistencia' => $os->equipamento->cliente->tecnico->nome_assistencia,
            'equipamento' => $os->equipamento->only('tipo', 'marca', 'modelo'),
            'status' => $os->status,
            'status_rotulo' => $os->status->rotulo(),
            'proximos' => array_map(fn (StatusOrdemServico $s) => $s->rotulo(), $os->status->proximos()),
            'data_abertura' => $os->data_abertura,
            'data_status' => $os->data_status,
            'data_entrega' => $os->data_entrega,
            // O orçamento só aparece depois de enviado ao cliente.
            'orcamento' => $orcamento ? [
                'valor_total' => $orcamento->valor_total,
                'situacao' => $orcamento->situacao,
                'validade_ate' => $orcamento->validade_ate?->toDateString(),
                'prazo_entrega' => $orcamento->prazo_entrega?->toDateString(),
            ] : null,
            'historico' => $os->historico->map(fn (HistoricoStatus $h) => [
                'status' => $h->status_novo,
                'status_rotulo' => $h->status_novo_rotulo,
                'data_hora' => $h->data_hora,
            ]),
        ]);
    }
}
