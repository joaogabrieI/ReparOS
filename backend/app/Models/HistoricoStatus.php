<?php

namespace App\Models;

use App\Enums\FormaDevolucao;
use App\Enums\StatusOrdemServico;
use App\Support\Auditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class HistoricoStatus extends Model
{
    protected $table = 'historico_status';

    // O registro já tem a própria data (data_hora) e nunca é editado.
    public $timestamps = false;

    // Nomes dos status como aparecem na tela, para o frontend não repetir a tradução.
    protected $appends = ['status_anterior_rotulo', 'status_novo_rotulo'];

    protected $fillable = [
        'ordem_servico_id',
        'usuario_id',
        'status_anterior',
        'status_novo',
        'retorno',
        'data_hora',
        'observacao',
    ];

    /**
     * O histórico é a prova do atendimento (ISO 27002 5.33): depois de gravado, não muda nem some.
     */
    protected static function booted(): void
    {
        // Quem mudou o status: o usuário logado, ou ninguém quando foi o cliente pelo link.
        static::creating(function (HistoricoStatus $registro) {
            if (! array_key_exists('usuario_id', $registro->getAttributes())) {
                $registro->usuario_id = Auditoria::usuarioId();
            }
        });

        // A abertura já fica registrada como criação da OS; as mudanças seguintes vão para o registro de atividade.
        static::created(function (HistoricoStatus $registro) {
            if ($registro->status_anterior === null) {
                return;
            }

            $os = $registro->ordemServico;
            Auditoria::registrar(
                $os->assistenciaId(),
                $registro->retorno ? 'voltou_etapa' : 'mudou_status',
                'ordem_servico',
                $os->id,
                $registro->retorno
                    ? "OS {$os->numero}: voltou de {$registro->status_anterior_rotulo} para {$registro->status_novo_rotulo}. Motivo: {$registro->observacao}"
                    : "OS {$os->numero}: {$registro->status_anterior_rotulo} → {$registro->status_novo_rotulo}",
                ['status' => $registro->status_anterior->value],
                ['status' => $registro->status_novo->value],
                $registro->usuario_id ? null : false,
            );
        });

        static::updating(fn () => throw new LogicException('O histórico da OS não pode ser alterado.'));
        static::deleting(fn () => throw new LogicException('O histórico da OS não pode ser apagado.'));
    }

    protected function casts(): array
    {
        return [
            'status_anterior' => StatusOrdemServico::class,
            'status_novo' => StatusOrdemServico::class,
            'retorno' => 'boolean',
            'data_hora' => 'datetime',
        ];
    }

    public function getStatusAnteriorRotuloAttribute(): ?string
    {
        return $this->status_anterior?->rotuloPara($this->formaDevolucao($this->status_anterior));
    }

    public function getStatusNovoRotuloAttribute(): string
    {
        return $this->status_novo->rotuloPara($this->formaDevolucao($this->status_novo));
    }

    /**
     * Só a OS pronta muda de nome conforme a forma de devolução; nos outros status nem consulta a OS.
     */
    private function formaDevolucao(?StatusOrdemServico $status): ?FormaDevolucao
    {
        if ($status !== StatusOrdemServico::ProntoParaRetirada) {
            return null;
        }

        // value() já devolve o enum, pelo cast do modelo.
        return $this->formaDevolucaoDaOs ??= OrdemServico::whereKey($this->ordem_servico_id)->value('forma_devolucao');
    }

    private ?FormaDevolucao $formaDevolucaoDaOs = null;

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class);
    }
}
