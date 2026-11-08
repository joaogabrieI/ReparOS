<?php

namespace App\Models;

use App\Enums\StatusOrdemServico;
use App\Exceptions\TransicaoInvalidaException;
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
    use HasFactory;

    protected $table = 'ordens_servico';

    protected $fillable = [
        'equipamento_id',
        'problema_relatado',
        'retirada_agendada',
        'data_retirada',
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
            'data_entrega' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Toda OS nasce "Aberta", com número próprio e o primeiro registro no histórico.
        static::creating(function (OrdemServico $os) {
            $os->numero ??= 'OS-'.now()->format('Ymd').'-'.Str::upper(Str::random(5));
            $os->status ??= StatusOrdemServico::Aberta;
            $os->data_abertura ??= now();
            $os->data_status ??= $os->data_abertura;
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
     * OS dos clientes de um técnico: a OS chega ao técnico pelo equipamento e pelo cliente.
     */
    public function scopeDoTecnico(Builder $query, int $tecnicoId): void
    {
        $query->whereHas('equipamento.cliente', fn ($query) => $query->where('tecnico_id', $tecnicoId));
    }

    public function pertenceA(Tecnico $tecnico): bool
    {
        return $this->equipamento->cliente->tecnico_id === $tecnico->id;
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
