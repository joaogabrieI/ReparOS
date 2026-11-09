<?php

namespace App\Http\Controllers;

use App\Enums\SituacaoOrcamento;
use App\Enums\StatusOrdemServico;
use App\Http\Requests\OrcamentoRequest;
use App\Http\Requests\RespostaOrcamentoRequest;
use App\Models\OrdemServico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Orçamento da OS: lançamento, envio ao cliente e registro da resposta (RF11, RF12, RF19).
 */
class OrcamentoController extends Controller
{
    /**
     * Lança ou corrige o orçamento depois do diagnóstico. Os itens enviados substituem os anteriores
     * e o total é recalculado no servidor.
     */
    public function salvar(OrcamentoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_unless(
            $ordemServico->status === StatusOrdemServico::DiagnosticoRealizado,
            422,
            $ordemServico->orcamento
                ? 'O orçamento já foi enviado ao cliente e não pode mais ser alterado.'
                : 'Registre o diagnóstico antes de lançar o orçamento.',
        );

        $dados = $request->validated();
        $criado = ! $ordemServico->orcamento;

        $orcamento = DB::transaction(function () use ($ordemServico, $dados) {
            $orcamento = $ordemServico->orcamento()->updateOrCreate([], [
                'prazo_dias' => $dados['prazo_dias'],
                'validade_dias' => $dados['validade_dias'] ?? $ordemServico->orcamento?->validade_dias ?? 10,
            ]);
            $orcamento->itens()->delete();
            $orcamento->itens()->createMany($dados['itens']);
            $orcamento->recalcularTotal();

            return $orcamento;
        });

        return response()->json($orcamento->refresh()->load('itens'), $criado ? 201 : 200);
    }

    /**
     * O técnico enviou o orçamento pelo WhatsApp: grava a data de envio e a validade e leva a OS a
     * "Orçamento enviado" e então "Aguardando aprovação". Daí em diante itens e valores ficam travados.
     */
    public function enviar(Request $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_unless($ordemServico->pertenceA($request->user()), 404, 'OS não encontrada.');

        $orcamento = $ordemServico->orcamento;
        abort_unless($orcamento && $orcamento->itens()->exists(), 422, 'Lance o orçamento antes de enviá-lo.');

        DB::transaction(function () use ($ordemServico, $orcamento) {
            $ordemServico->mudarStatus(StatusOrdemServico::OrcamentoEnviado);
            $orcamento->update([
                'situacao' => SituacaoOrcamento::Pendente,
                'data_envio' => now(),
                'validade_ate' => today()->addDays($orcamento->validade_dias),
                'codigo_resposta' => Str::random(32),
            ]);
            $ordemServico->mudarStatus(StatusOrdemServico::AguardandoAprovacao);
        });

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Registra a resposta do cliente. Aprovado: "Em reparo", e o prazo vira data contando dias úteis.
     * Recusado: "Orçamento recusado", seguindo para a devolução sem reparo.
     */
    public function responder(RespostaOrcamentoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        $dados = $request->validated();
        $orcamento = $ordemServico->orcamento;
        abort_unless($orcamento && $orcamento->data_envio, 422, 'Envie o orçamento ao cliente antes de registrar a resposta.');

        $aprovado = (bool) $dados['aprovado'];

        $orcamento->registrarResposta(
            $aprovado,
            $dados['canal'],
            trim(($aprovado ? 'Orçamento aprovado' : 'Orçamento recusado').' pelo cliente via '.$dados['canal'].'. '.($dados['observacao'] ?? '')),
        );

        return response()->json($this->ficha($ordemServico));
    }

    private function ficha(OrdemServico $os): OrdemServico
    {
        return $os->refresh()->load(['orcamento.itens', 'historico']);
    }
}
