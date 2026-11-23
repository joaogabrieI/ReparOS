<?php

namespace App\Http\Controllers;

use App\Enums\StatusOrdemServico;
use App\Http\Requests\CancelamentoRequest;
use App\Http\Requests\ClienteRequest;
use App\Http\Requests\DiagnosticoRequest;
use App\Http\Requests\EdicaoOrdemServicoRequest;
use App\Http\Requests\EquipamentoRequest;
use App\Http\Requests\OrdemServicoRequest;
use App\Http\Requests\ResponsavelRequest;
use App\Http\Requests\RetiradaRequest;
use App\Http\Requests\VoltarEtapaRequest;
use App\Models\OrdemServico;
use App\Support\MensagemWhatsApp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Ordens de serviço dos clientes da assistência do usuário logado: abertura, ficha, edição, técnico
 * responsável, retirada e diagnóstico. Cada assistência só enxerga as OS dos próprios clientes.
 */
class OrdemServicoController extends Controller
{
    /**
     * Busca de OS (RF23, RF24). Filtros opcionais: `busca` (número da OS, nome ou telefone do cliente,
     * marca ou modelo), `status`, `tipo` do equipamento, período de abertura (`de`, `ate`), `pendentes`
     * (não entregues e não encerradas pelo cancelamento), `paradas` (mais de 3 dias na mesma etapa), `equipamento_id`, `cliente_id`,
     * `responsavel_id` e `minhas` (só as OS em que o usuário logado é o responsável).
     * `ordem`: recentes (padrão), antigas ou mudanca (última mudança de status). A lista não traz o endereço do cliente.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(StatusOrdemServico::class)],
            'tipo' => ['nullable', Rule::in(EquipamentoRequest::TIPOS)],
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:de'],
            'pendentes' => ['nullable', 'boolean'],
            'paradas' => ['nullable', 'boolean'],
            'minhas' => ['nullable', 'boolean'],
            'responsavel_id' => ['nullable', 'integer'],
            'ordem' => ['nullable', Rule::in(['recentes', 'antigas', 'mudanca'])],
        ], [
            'status.enum' => 'Status inválido.',
            'tipo.in' => 'Tipo de equipamento inválido.',
            'de.date_format' => 'Informe a data inicial no formato aaaa-mm-dd.',
            'ate.date_format' => 'Informe a data final no formato aaaa-mm-dd.',
            'ate.after_or_equal' => 'A data final não pode ser antes da inicial.',
            'pendentes.boolean' => 'O filtro de pendentes deve ser verdadeiro ou falso.',
            'paradas.boolean' => 'O filtro de paradas deve ser verdadeiro ou falso.',
            'minhas.boolean' => 'O filtro "minhas OS" deve ser verdadeiro ou falso.',
            'responsavel_id.integer' => 'Técnico responsável inválido.',
            'ordem.in' => 'Ordenação inválida.',
        ]);

        $busca = trim((string) $request->query('busca', ''));
        // Mesmo critério da busca de clientes: só compara telefone quando o texto parece um telefone.
        $digitos = preg_match('/^[\d\s()+.-]+$/', $busca) ? ClienteRequest::normalizarTelefone($busca) : '';

        $ordens = OrdemServico::query()
            ->daAssistencia($request->user()->assistencia_id)
            ->when($request->boolean('minhas'), fn ($query) => $query->where('responsavel_id', $request->user()->id))
            ->when($request->filled('responsavel_id'), fn ($query) => $query->where('responsavel_id', (int) $request->query('responsavel_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->query('status')))
            ->when($request->filled('equipamento_id'), fn ($query) => $query->where('equipamento_id', (int) $request->query('equipamento_id')))
            ->when($request->filled('cliente_id'), fn ($query) => $query->whereRelation('equipamento', 'cliente_id', (int) $request->query('cliente_id')))
            ->when($request->filled('tipo'), fn ($query) => $query->whereRelation('equipamento', 'tipo', $request->query('tipo')))
            ->when($request->filled('de'), fn ($query) => $query->where('data_abertura', '>=', Carbon::parse($request->query('de'))->startOfDay()))
            ->when($request->filled('ate'), fn ($query) => $query->where('data_abertura', '<=', Carbon::parse($request->query('ate'))->endOfDay()))
            ->when($request->boolean('pendentes'), fn ($query) => $query->pendentes())
            ->when($request->boolean('paradas'), fn ($query) => $query->paradas())
            ->when($busca !== '', function ($query) use ($busca, $digitos) {
                $query->where(function ($query) use ($busca, $digitos) {
                    $query->where('numero', 'ilike', '%'.$busca.'%')
                        ->orWhereHas('equipamento', fn ($query) => $query
                            ->where('marca', 'ilike', '%'.$busca.'%')
                            ->orWhere('modelo', 'ilike', '%'.$busca.'%'))
                        ->orWhereHas('equipamento.cliente', function ($query) use ($busca, $digitos) {
                            $query->where('nome', 'ilike', '%'.$busca.'%');
                            if ($digitos !== '') {
                                $query->orWhere('telefone_whatsapp', 'like', '%'.$digitos.'%');
                            }
                        });
                });
            })
            ->with('equipamento:id,cliente_id,tipo,marca,modelo', 'equipamento.cliente:id,nome,telefone_whatsapp', 'responsavel:id,nome')
            ->when(
                $request->query('ordem') === 'antigas',
                fn ($query) => $query->oldest('data_abertura')->orderBy('id'),
                fn ($query) => $query->latest($request->query('ordem') === 'mudanca' ? 'data_status' : 'data_abertura')->orderByDesc('id'),
            )
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
     * Edita a OS (RF08): corrige equipamento, problema, retirada combinada, responsável, diagnóstico,
     * forma de devolução (retirada ou entrega, com endereço e data) e anotações do reparo, cada um nas etapas permitidas (ver EdicaoOrdemServicoRequest). O status não muda;
     * o antes e o depois de cada campo, com o motivo, vão para o registro de atividade.
     */
    public function update(EdicaoOrdemServicoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        $dados = $request->safe()->except('motivo');

        if ($dados !== []) {
            $ordemServico->motivoAlteracao = $request->validated('motivo');
            $ordemServico->update($dados);
        }

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Volta a OS para a etapa anterior, com motivo. Gera um novo registro no histórico (sem apagar os
     * anteriores) e desfaz o que a etapa tinha gravado; ver OrdemServico::voltarEtapa().
     */
    public function voltarEtapa(VoltarEtapaRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        $esperado = $request->validated('status_atual');

        $ordemServico->voltarEtapa(
            $request->validated('motivo'),
            $esperado ? StatusOrdemServico::from($esperado) : null,
        );

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Cancela a OS, com motivo (desistência do cliente). Com o equipamento na assistência, a OS fica
     * cancelada até a devolução sem reparo (POST /entrega); antes da retirada, já fica encerrada.
     */
    public function cancelar(CancelamentoRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        $esperado = $request->validated('status_atual');

        $ordemServico->cancelar(
            $request->validated('motivo'),
            $esperado ? StatusOrdemServico::from($esperado) : null,
        );

        return response()->json($this->ficha($ordemServico));
    }

    /**
     * Troca o técnico responsável pela OS. Qualquer usuário da assistência pode trocar, em qualquer etapa;
     * o novo responsável precisa ser um usuário ativo da mesma assistência.
     */
    public function responsavel(ResponsavelRequest $request, OrdemServico $ordemServico): JsonResponse
    {
        $ordemServico->update(['responsavel_id' => $request->validated('responsavel_id')]);

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

    /**
     * Mensagem pronta para o status atual e o link wa.me para o técnico enviar ao cliente (RF18).
     */
    public function whatsapp(Request $request, OrdemServico $ordemServico): JsonResponse
    {
        abort_unless($ordemServico->pertenceA($request->user()), 404, 'OS não encontrada.');

        $ordemServico->load('equipamento.cliente.assistencia', 'orcamento.itens');
        $mensagem = new MensagemWhatsApp($ordemServico);

        return response()->json([
            'status' => $ordemServico->status,
            'telefone' => $mensagem->telefone(),
            'mensagem' => $mensagem->texto(),
            'link' => $mensagem->link(),
            'acompanhamento' => $mensagem->linkAcompanhamento(),
        ]);
    }

    private function ficha(OrdemServico $os): OrdemServico
    {
        return $os->refresh()->load([
            'equipamento:id,cliente_id,tipo,marca,modelo,numero_serie',
            // O endereço do cadastro sugere o endereço de entrega.
            'equipamento.cliente:id,nome,telefone_whatsapp,endereco',
            'orcamento.itens',
            'historico.usuario:id,nome',
            'responsavel:id,nome,ativo',
            'criadoPor:id,nome',
        ]);
    }
}
