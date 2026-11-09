<?php

namespace App\Http\Controllers;

use App\Enums\StatusOrdemServico;
use App\Http\Requests\RespostaClienteRequest;
use App\Models\HistoricoStatus;
use App\Models\ItemOrcamento;
use App\Models\Orcamento;
use App\Models\OrdemServico;
use Illuminate\Http\JsonResponse;

/**
 * Área do cliente, sem login: andamento da OS pelo número que ele recebeu e a resposta ao orçamento.
 * Mostra só o necessário para acompanhar o reparo; nada de telefone, endereço ou anotações internas do técnico.
 */
class AcompanhamentoController extends Controller
{
    public function show(string $numero): JsonResponse
    {
        return response()->json($this->andamento($this->buscar($numero)));
    }

    /**
     * O cliente aprova ou recusa o orçamento pela tela, com o código do link do WhatsApp. Segue as mesmas regras
     * da resposta registrada pelo técnico (um passo no fluxo, histórico imutável), com o canal "link".
     * Orçamento vencido não pode ser aprovado por aqui: os valores precisam ser confirmados com a assistência.
     */
    public function responder(RespostaClienteRequest $request, string $numero): JsonResponse
    {
        $os = $this->buscar($numero);
        $orcamento = $os->orcamento;

        abort_unless(
            $os->status === StatusOrdemServico::AguardandoAprovacao && $orcamento,
            422,
            'Esta OS não está aguardando a resposta do orçamento.',
        );
        abort_unless(
            $orcamento->codigoConfere($request->validated('codigo')),
            403,
            'Este link não permite responder ao orçamento. Use o último link enviado pela assistência.',
        );

        $aprovado = (bool) $request->validated('aprovado');
        abort_if(
            $aprovado && $orcamento->vencido,
            422,
            'Este orçamento venceu em '.$orcamento->validade_ate->format('d/m/Y').'. Fale com a assistência para confirmar os valores.',
        );

        $orcamento->registrarResposta(
            $aprovado,
            Orcamento::CANAL_LINK,
            ($aprovado ? 'Orçamento aprovado' : 'Orçamento recusado').' pelo próprio cliente na tela de acompanhamento (link enviado pelo WhatsApp).',
        );

        return response()->json($this->andamento($this->buscar($numero)));
    }

    private function buscar(string $numero): OrdemServico
    {
        $os = OrdemServico::query()
            ->where('numero', strtoupper(trim($numero)))
            ->with('equipamento:id,cliente_id,tipo,marca,modelo', 'equipamento.cliente.tecnico:id,nome_assistencia', 'orcamento.itens', 'historico')
            ->first();

        abort_if($os === null, 404, 'OS não encontrada.');

        return $os;
    }

    private function andamento(OrdemServico $os): array
    {
        $orcamento = $os->orcamento?->data_envio ? $os->orcamento : null;

        return [
            'numero' => $os->numero,
            'assistencia' => $os->equipamento->cliente->tecnico->nome_assistencia,
            'equipamento' => $os->equipamento->only('tipo', 'marca', 'modelo'),
            'status' => $os->status,
            'status_rotulo' => $os->status->rotulo(),
            'proximos' => array_map(fn (StatusOrdemServico $s) => $s->rotulo(), $os->status->proximos()),
            'data_abertura' => $os->data_abertura,
            'data_status' => $os->data_status,
            'data_entrega' => $os->data_entrega,
            // O orçamento só aparece depois de enviado ao cliente, com os itens para ele saber o que está aprovando.
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
