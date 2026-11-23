<?php

namespace App\Models;

use App\Enums\FormaDevolucao;
use App\Enums\SituacaoOrcamento;
use App\Enums\StatusOrdemServico;
use App\Exceptions\TransicaoInvalidaException;
use App\Models\Concerns\RegistraAtividade;
use App\Support\Auditoria;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrdemServico extends Model
{
    use HasFactory, RegistraAtividade;

    protected $table = 'ordens_servico';

    /**
     * OS parada: mais de 3 dias na mesma etapa sem ser entregue (RF24).
     */
    public const DIAS_PARADA = 3;

    /**
     * Garantia legal do serviço: 90 dias a partir da entrega (CDC art. 26, II, serviço durável).
     */
    public const DIAS_GARANTIA = 90;

    protected $appends = ['dias_na_etapa', 'parada', 'status_rotulo', 'forma_devolucao_rotulo', 'garantia', 'devolucao_pendente'];

    /**
     * Status e data_status já vão para o histórico e para o registro de atividade como "mudou_status";
     * o motivo e a data do cancelamento, como "cancelou".
     */
    protected array $naoAuditar = ['status', 'data_status', 'motivo_cancelamento', 'data_cancelamento'];

    protected $fillable = [
        'equipamento_id',
        'responsavel_id',
        'problema_relatado',
        'retirada_agendada',
        'data_retirada',
        'forma_devolucao',
        'endereco_entrega',
        'entrega_agendada',
        'diagnostico',
        'servico_executado',
        'pecas_trocadas',
        'data_entrega',
    ];

    protected function casts(): array
    {
        return [
            'status' => StatusOrdemServico::class,
            'data_status' => 'datetime',
            'data_abertura' => 'datetime',
            'retirada_agendada' => 'datetime',
            'data_retirada' => 'datetime',
            'forma_devolucao' => FormaDevolucao::class,
            'entrega_agendada' => 'datetime',
            'data_entrega' => 'datetime',
            'data_cancelamento' => 'datetime',
        ];
    }

    /**
     * O navegador manda as datas em UTC (toISOString, com "Z"). O banco guarda no horário de Brasília,
     * então a data é convertida antes de gravar; sem isso, "14:30 em Brasília" virava 17:30.
     */
    public function fromDateTime($value)
    {
        return empty($value) ? $value : $this->asDateTime($value)->setTimezone(config('app.timezone'))->format($this->getDateFormat());
    }

    protected static function booted(): void
    {
        // Toda OS nasce "Aberta", com número próprio e o primeiro registro no histórico.
        static::creating(function (OrdemServico $os) {
            $os->numero ??= 'OS-'.now()->format('Ymd').'-'.Str::upper(Str::random(5));
            $os->status ??= StatusOrdemServico::Aberta;
            $os->data_abertura ??= now();
            $os->data_status ??= $os->data_abertura;
            // Responsável: quem abriu a OS, a menos que outro seja escolhido na abertura.
            $os->responsavel_id ??= Auditoria::usuarioId() ?? $os->equipamento?->cliente?->assistencia
                ?->usuarios()->where('perfil', 'admin')->where('ativo', true)->orderBy('id')->value('id');
        });

        // Retirada na assistência não tem endereço nem data de entrega. Entrega sem endereço informado
        // usa o endereço do cadastro do cliente.
        static::saving(function (OrdemServico $os) {
            $os->forma_devolucao ??= FormaDevolucao::Retirada;

            if ($os->forma_devolucao === FormaDevolucao::Retirada) {
                $os->endereco_entrega = null;
                $os->entrega_agendada = null;
            } elseif (blank($os->endereco_entrega)) {
                $os->endereco_entrega = $os->equipamento?->cliente?->endereco;
            }
        });

        static::created(function (OrdemServico $os) {
            $os->historico()->create([
                'status_anterior' => null,
                'status_novo' => $os->status,
                'data_hora' => $os->data_status,
                'observacao' => 'OS aberta',
            ]);
        });
    }

    /**
     * Troca o status e grava o histórico na mesma transação.
     * Só aceita o próximo passo do fluxo (RF16); a linha fica travada para dois pedidos
     * simultâneos não avançarem a mesma etapa duas vezes.
     *
     * @throws TransicaoInvalidaException
     */
    public function mudarStatus(StatusOrdemServico $novo, ?string $observacao = null): void
    {
        DB::transaction(function () use ($novo, $observacao) {
            $anterior = static::whereKey($this->id)->lockForUpdate()->firstOrFail(['status'])->status;

            if (! $anterior->podeIrPara($novo)) {
                throw TransicaoInvalidaException::entre($anterior, $novo);
            }

            $this->status = $novo;
            $this->data_status = now();
            $this->save();

            $this->historico()->create([
                'status_anterior' => $anterior,
                'status_novo' => $novo,
                'data_hora' => $this->data_status,
                'observacao' => $observacao,
            ]);
        });
    }

    /**
     * Cancela a OS (desistência do cliente), com motivo obrigatório. Vale para qualquer etapa antes da
     * devolução (ver StatusOrdemServico::cancelavel()). O histórico ganha o registro do cancelamento e o
     * registro de atividade, a ação "cancelou". Se o equipamento já foi retirado, a OS fica aguardando a
     * devolução sem reparo, registrada pela entrega; se não, a OS já está encerrada.
     *
     * `$statusEsperado` é a etapa que o usuário via na tela: se a OS já mudou, nada acontece.
     *
     * @throws TransicaoInvalidaException
     */
    public function cancelar(string $motivo, ?StatusOrdemServico $statusEsperado = null): void
    {
        DB::transaction(function () use ($motivo, $statusEsperado) {
            $atual = static::whereKey($this->id)->lockForUpdate()->firstOrFail(['status'])->status;

            if ($statusEsperado && $atual !== $statusEsperado) {
                throw TransicaoInvalidaException::etapaMudou($atual, 'cancelar');
            }

            if (! $atual->cancelavel()) {
                throw TransicaoInvalidaException::naoCancelavel($atual);
            }

            $this->refresh();
            $this->motivo_cancelamento = $motivo;
            $this->data_cancelamento = now();
            $this->mudarStatus(StatusOrdemServico::Cancelada, $motivo);
        });
    }

    /**
     * Volta a OS para a etapa anterior (correção de um passo dado por engano). O histórico ganha um novo
     * registro, marcado como retorno e com o motivo; os registros anteriores ficam como estavam (ISO 27002 5.33).
     * O que a etapa desfeita gravou também é desfeito: a data da retirada ou da entrega, o envio do
     * orçamento (que volta a ser rascunho e invalida o link do cliente) ou a resposta do cliente
     * (o orçamento volta a aguardar resposta, com um link novo).
     *
     * `$statusEsperado` é a etapa que o usuário via na tela: se a OS já mudou, nada acontece.
     *
     * @throws TransicaoInvalidaException
     */
    public function voltarEtapa(string $motivo, ?StatusOrdemServico $statusEsperado = null): void
    {
        DB::transaction(function () use ($motivo, $statusEsperado) {
            $atual = static::whereKey($this->id)->lockForUpdate()->firstOrFail(['status'])->status;

            if ($statusEsperado && $atual !== $statusEsperado) {
                throw TransicaoInvalidaException::etapaMudou($atual);
            }

            // Entregue e Cancelada voltam para onde a OS estava antes (vem do histórico).
            $anterior = in_array($atual, [StatusOrdemServico::Entregue, StatusOrdemServico::Cancelada], true)
                ? $this->historico()->reorder()->where('status_novo', $atual)->where('retorno', false)
                    ->orderByDesc('data_hora')->orderByDesc('id')->value('status_anterior')
                : $atual->anterior();
            $anterior = is_string($anterior) ? StatusOrdemServico::from($anterior) : $anterior;

            if (! $anterior) {
                throw TransicaoInvalidaException::semEtapaAnterior($atual);
            }

            $this->refresh();
            $this->desfazerEtapa($atual, $anterior);

            $this->status = $anterior;
            $this->data_status = now();
            $this->save();

            $this->historico()->create([
                'status_anterior' => $atual,
                'status_novo' => $anterior,
                'retorno' => true,
                'data_hora' => $this->data_status,
                'observacao' => $motivo,
            ]);
        });
    }

    private function desfazerEtapa(StatusOrdemServico $atual, StatusOrdemServico $anterior): void
    {
        // Cancelamento desfeito: a OS volta para a etapa em que estava, com o orçamento como estava.
        if ($atual === StatusOrdemServico::Cancelada) {
            $this->motivo_cancelamento = null;
            $this->data_cancelamento = null;

            return;
        }

        $orcamento = $this->orcamento;

        match (true) {
            $anterior === StatusOrdemServico::Aberta => $this->data_retirada = null,
            $atual === StatusOrdemServico::Entregue => $this->data_entrega = null,
            // Orçamento enviado → rascunho: itens e valores voltam a ser editáveis.
            $anterior === StatusOrdemServico::DiagnosticoRealizado && $orcamento !== null => $orcamento->update([
                'situacao' => SituacaoOrcamento::Pendente,
                'data_envio' => null,
                'validade_ate' => null,
                'data_resposta' => null,
                'canal_resposta' => null,
                'prazo_entrega' => null,
            ]),
            // Resposta do cliente desfeita: o orçamento volta a aguardar resposta.
            $anterior === StatusOrdemServico::AguardandoAprovacao && $orcamento !== null => $orcamento->update([
                'situacao' => SituacaoOrcamento::Pendente,
                'data_resposta' => null,
                'canal_resposta' => null,
                'prazo_entrega' => null,
            ]),
            default => null,
        };
    }

    /**
     * OS dos clientes de uma assistência: a OS chega à assistência pelo equipamento e pelo cliente.
     */
    public function scopeDaAssistencia(Builder $query, int $assistenciaId): void
    {
        $query->whereHas('equipamento.cliente', fn ($query) => $query->where('assistencia_id', $assistenciaId));
    }

    /**
     * OS que ainda pedem algo da assistência: não entregues e não encerradas pelo cancelamento. A cancelada
     * com o equipamento na assistência continua pendente até a devolução.
     */
    public function scopePendentes(Builder $query): void
    {
        $query->where('status', '!=', StatusOrdemServico::Entregue)
            ->where(fn ($query) => $query->where('status', '!=', StatusOrdemServico::Cancelada)->orWhereNotNull('data_retirada'));
    }

    /**
     * OS em andamento que estão há mais de DIAS_PARADA dias na mesma etapa (RF24). Cancelada não conta.
     */
    public function scopeParadas(Builder $query): void
    {
        $query->whereNotIn('status', [StatusOrdemServico::Entregue, StatusOrdemServico::Cancelada])
            ->where('data_status', '<', today()->subDays(self::DIAS_PARADA));
    }

    /**
     * OS cancelada com o equipamento na assistência: falta devolvê-lo ao cliente, sem reparo.
     */
    public function getDevolucaoPendenteAttribute(): bool
    {
        return $this->status === StatusOrdemServico::Cancelada && $this->data_retirada !== null;
    }

    /**
     * Dias corridos desde a última mudança de status ("hoje" = 0).
     */
    public function getDiasNaEtapaAttribute(): int
    {
        return (int) $this->data_status->copy()->startOfDay()->diffInDays(today());
    }

    /**
     * Nome do status como aparece na tela: "Pronto para entrega" quando o equipamento vai ser entregue.
     */
    public function getStatusRotuloAttribute(): ?string
    {
        return $this->status?->rotuloPara($this->forma_devolucao);
    }

    public function getFormaDevolucaoRotuloAttribute(): ?string
    {
        return ($this->forma_devolucao ?? FormaDevolucao::Retirada)->rotulo();
    }

    /**
     * Observação padrão do histórico quando o equipamento volta para o cliente.
     */
    public function observacaoDevolucao(bool $semReparo): string
    {
        $entrega = $this->forma_devolucao === FormaDevolucao::Entrega;

        return match (true) {
            $this->status === StatusOrdemServico::Cancelada && $entrega => 'OS cancelada: equipamento devolvido sem reparo, entregue no endereço do cliente',
            $this->status === StatusOrdemServico::Cancelada => 'OS cancelada: equipamento devolvido sem reparo',
            $semReparo && $entrega => 'Equipamento devolvido sem reparo, entregue no endereço do cliente',
            $semReparo => 'Equipamento devolvido sem reparo',
            $entrega => 'Equipamento entregue no endereço do cliente',
            default => 'Equipamento retirado pelo cliente na assistência',
        };
    }

    /**
     * Garantia legal do reparo, calculada a partir da data de entrega (sem coluna própria). O prazo conta
     * do dia seguinte à entrega: entregue em 23/11, a garantia vale até 21/02. OS devolvida sem reparo
     * (orçamento recusado) não tem serviço a garantir e devolve null, assim como OS ainda não entregue.
     *
     * @return array{dias: int, inicio: string, ate: string, ativa: bool, dias_restantes: int}|null
     */
    public function getGarantiaAttribute(): ?array
    {
        if (! $this->foiReparada()) {
            return null;
        }

        $inicio = $this->data_entrega->copy()->startOfDay();
        $ate = $inicio->copy()->addDays(self::DIAS_GARANTIA);

        return [
            'dias' => self::DIAS_GARANTIA,
            'inicio' => $inicio->toDateString(),
            'ate' => $ate->toDateString(),
            'ativa' => today()->lte($ate),
            'dias_restantes' => max(0, (int) today()->diffInDays($ate, false)),
        ];
    }

    /**
     * Entregue depois do reparo: tem serviço executado, o orçamento não foi recusado e a OS não foi cancelada.
     */
    public function foiReparada(): bool
    {
        return $this->status === StatusOrdemServico::Entregue
            && $this->data_entrega !== null
            && $this->data_cancelamento === null
            && filled($this->servico_executado)
            && $this->orcamento?->situacao !== SituacaoOrcamento::Recusado;
    }

    public function getParadaAttribute(): bool
    {
        return ! in_array($this->status, [StatusOrdemServico::Entregue, StatusOrdemServico::Cancelada], true)
            && $this->dias_na_etapa > self::DIAS_PARADA;
    }

    /**
     * A OS é da assistência do usuário: qualquer usuário dela pode consultá-la e movimentá-la.
     */
    public function pertenceA(Usuario $usuario): bool
    {
        return $this->assistenciaId() === $usuario->assistencia_id;
    }

    public function assistenciaId(): int
    {
        return $this->equipamento->cliente->assistencia_id;
    }

    public function descricaoAuditoria(): string
    {
        return "a OS {$this->numero}";
    }

    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'responsavel_id');
    }

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'criado_por_id');
    }

    public function equipamento(): BelongsTo
    {
        return $this->belongsTo(Equipamento::class);
    }

    public function orcamento(): HasOne
    {
        return $this->hasOne(Orcamento::class);
    }

    public function historico(): HasMany
    {
        // Mudanças no mesmo segundo (envio do orçamento) ficam na ordem em que foram gravadas.
        return $this->hasMany(HistoricoStatus::class)->orderBy('data_hora')->orderBy('id');
    }
}
