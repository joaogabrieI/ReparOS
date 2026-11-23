<?php

namespace App\Http\Controllers;

use App\Enums\FormaDevolucao;
use App\Enums\StatusOrdemServico;
use App\Models\OrdemServico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Resumo da assistência para a tela Início, a barra lateral e as OS pendentes: contagens, agenda de
 * hoje e amanhã, o que precisa de ação e a atividade recente. Substitui carregar a lista inteira de OS
 * só para contar: a lista completa continua em /api/ordens-servico, para quem precisa dela.
 */
class PainelController extends Controller
{
    /** Quantas OS aparecem em "Precisa da sua ação" e em "Atividade recente". */
    private const LIMITE_ACOES = 5;

    private const LIMITE_ATIVIDADE = 6;

    public function __invoke(Request $request): JsonResponse
    {
        $assistenciaId = $request->user()->assistencia_id;
        $base = fn () => OrdemServico::query()->daAssistencia($assistenciaId);
        $relacoes = ['equipamento:id,cliente_id,tipo,marca,modelo', 'equipamento.cliente:id,nome,telefone_whatsapp,endereco', 'responsavel:id,nome'];

        // As pendentes são poucas (não entregues): contadas e ordenadas aqui, com os mesmos atributos da lista.
        $pendentes = $base()->pendentes()->with($relacoes)->latest('data_abertura')->orderByDesc('id')->get();
        $paradas = $pendentes->filter->parada;
        $prontas = $pendentes->where('status', StatusOrdemServico::ProntoParaRetirada);

        $agora = now();
        $inicioMes = $agora->copy()->startOfMonth();
        $inicioMesAnterior = $inicioMes->copy()->subMonth();
        $entregues = fn ($de, $ate) => $base()->whereBetween('data_entrega', [$de, $ate])->count();

        $agenda = $this->agenda($pendentes);

        $acoes = $pendentes
            ->reject(fn (OrdemServico $os) => $os->status === StatusOrdemServico::Aberta)
            ->sort(fn (OrdemServico $a, OrdemServico $b) => [$b->parada, $b->dias_na_etapa] <=> [$a->parada, $a->dias_na_etapa])
            ->take(self::LIMITE_ACOES)
            ->values();

        $atividade = $base()
            ->with([...$relacoes, 'orcamento:id,ordem_servico_id,situacao'])
            ->latest('data_status')
            ->orderByDesc('id')
            ->limit(self::LIMITE_ATIVIDADE)
            ->get();

        // O endereço do cliente só sai na agenda (a lista de OS não traz o endereço).
        foreach ([$pendentes, $atividade] as $lista) {
            $lista->each(fn (OrdemServico $os) => $os->equipamento?->cliente?->makeHidden('endereco'));
        }

        return response()->json([
            'pendentes' => $pendentes->count(),
            'por_status' => collect(StatusOrdemServico::cases())
                ->mapWithKeys(fn (StatusOrdemServico $s) => [$s->value => $pendentes->where('status', $s)->count()]),
            'paradas' => $paradas->count(),
            'parada_mais_antiga_dias' => (int) $paradas->max('dias_na_etapa'),
            'prontas' => $prontas->count(),
            'pronta_desde' => $prontas->min('data_status')?->toIso8601String(),
            'abertas_hoje' => $base()->whereBetween('data_abertura', [$agora->copy()->startOfDay(), $agora->copy()->endOfDay()])->count(),
            'entregues_mes' => $entregues($inicioMes, $agora->copy()->endOfMonth()),
            'entregues_mes_anterior' => $entregues($inicioMesAnterior, $inicioMes->copy()->subSecond()),
            'agenda' => $agenda,
            'acoes' => $acoes,
            'atividade' => $atividade,
        ]);
    }

    /**
     * Retiradas e entregas combinadas para hoje e amanhã, em ordem de horário. A retirada busca o
     * equipamento no cliente (OS aberta) no endereço do cadastro; a entrega leva de volta ao endereço de
     * entrega da OS. `pronta` diz se o equipamento já pode voltar (senão a tela avisa "OS ainda não pronta").
     *
     * @param  Collection<int, OrdemServico>  $pendentes
     */
    private function agenda(Collection $pendentes): Collection
    {
        $de = today();
        $ate = today()->addDay()->endOfDay();
        $noPeriodo = fn ($data) => $data !== null && $data->between($de, $ate);

        $retiradas = $pendentes
            ->filter(fn (OrdemServico $os) => $os->status === StatusOrdemServico::Aberta && $noPeriodo($os->retirada_agendada))
            ->map(fn (OrdemServico $os) => [
                'tipo' => 'retirada',
                'quando' => $os->retirada_agendada->toIso8601String(),
                'endereco' => $os->equipamento?->cliente?->endereco,
                'pronta' => true,
                'ordem' => $os,
            ]);

        $entregas = $pendentes
            ->filter(fn (OrdemServico $os) => $os->forma_devolucao === FormaDevolucao::Entrega && $noPeriodo($os->entrega_agendada))
            ->map(fn (OrdemServico $os) => [
                'tipo' => 'entrega',
                'quando' => $os->entrega_agendada->toIso8601String(),
                'endereco' => $os->endereco_entrega ?: $os->equipamento?->cliente?->endereco,
                'pronta' => in_array($os->status, [StatusOrdemServico::ProntoParaRetirada, StatusOrdemServico::OrcamentoRecusado], true)
                    || $os->devolucao_pendente,
                'ordem' => $os,
            ]);

        return $retiradas->concat($entregas)->sortBy('quando')->values();
    }
}
