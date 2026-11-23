<?php

namespace App\Http\Controllers;

use App\Enums\StatusOrdemServico;
use App\Models\HistoricoStatus;
use App\Models\ItemOrcamento;
use App\Models\OrdemServico;
use Illuminate\Http\JsonResponse;

/**
 * Área do cliente, sem login: só consulta o andamento da OS pelo número que ele recebeu. O cliente não
 * aprova nem recusa o orçamento por aqui: responde à assistência, que registra a resposta no sistema.
 * Mostra só o necessário para acompanhar o reparo; nada de telefone, endereço ou anotações internas do técnico.
 */
class AcompanhamentoController extends Controller
{
    public function show(string $numero): JsonResponse
    {
        return response()->json($this->andamento($this->buscar($numero)));
    }

    private function buscar(string $numero): OrdemServico
    {
        $os = OrdemServico::query()
            ->where('numero', strtoupper(trim($numero)))
            ->with('equipamento:id,cliente_id,tipo,marca,modelo', 'equipamento.cliente.assistencia:id,nome', 'orcamento.itens', 'historico')
            ->first();

        abort_if($os === null, 404, 'OS não encontrada.');

        return $os;
    }

    private function andamento(OrdemServico $os): array
    {
        $orcamento = $os->orcamento?->data_envio ? $os->orcamento : null;

        return [
            'numero' => $os->numero,
            'assistencia' => $os->equipamento->cliente->assistencia->nome,
            'equipamento' => $os->equipamento->only('tipo', 'marca', 'modelo'),
            'status' => $os->status,
            'status_rotulo' => $os->status_rotulo,
            'proximos' => array_map(fn (StatusOrdemServico $s) => $s->rotuloPara($os->forma_devolucao), $os->status->proximos()),
            // Como o equipamento volta: o cliente vê se retira ou se recebe em casa, e a data combinada. O endereço não aparece.
            'forma_devolucao' => $os->forma_devolucao,
            'forma_devolucao_rotulo' => $os->forma_devolucao_rotulo,
            'entrega_agendada' => $os->entrega_agendada,
            'data_abertura' => $os->data_abertura,
            'data_status' => $os->data_status,
            'data_entrega' => $os->data_entrega,
            // Garantia legal de 90 dias do serviço (CDC art. 26); null quando a OS foi devolvida sem reparo.
            'garantia' => $os->garantia,
            // O orçamento só aparece depois de enviado ao cliente, com os itens, apenas para consulta.
            'orcamento' => $orcamento ? [
                'valor_total' => $orcamento->valor_total,
                'situacao' => $orcamento->situacao,
                'vencido' => $orcamento->vencido,
                'validade_ate' => $orcamento->validade_ate?->toDateString(),
                'prazo_dias' => $orcamento->prazo_dias,
                'prazo_entrega' => $orcamento->prazo_entrega?->toDateString(),
                'itens' => $orcamento->itens->map(fn (ItemOrcamento $item) => $item->only('tipo', 'descricao', 'quantidade', 'valor_unitario')),
            ] : null,
            'historico' => $os->historico->map(fn (HistoricoStatus $h) => [
                'status' => $h->status_novo,
                'status_rotulo' => $h->status_novo_rotulo,
                'data_hora' => $h->data_hora,
            ]),
        ];
    }
}
