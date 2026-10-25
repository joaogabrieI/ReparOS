<?php

namespace App\Models;

use App\Enums\StatusOrdemServico;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoricoStatus extends Model
{
    protected $table = 'historico_status';

    // O registro já tem a própria data (data_hora) e nunca é editado.
    public $timestamps = false;

    protected $fillable = [
        'ordem_servico_id',
        'status_anterior',
        'status_novo',
        'data_hora',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'status_anterior' => StatusOrdemServico::class,
            'status_novo' => StatusOrdemServico::class,
            'data_hora' => 'datetime',
        ];
    }

    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class);
    }
}
