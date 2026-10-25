<?php

namespace App\Models;

use App\Enums\SituacaoOrcamento;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Orcamento extends Model
{
    use HasFactory;

    protected $fillable = [
        'ordem_servico_id',
        'valor_total',
        'prazo_entrega',
        'situacao',
        'data_envio',
        'data_resposta',
    ];

    protected function casts(): array
    {
        return [
            'valor_total' => 'decimal:2',
            'prazo_entrega' => 'date',
            'situacao' => SituacaoOrcamento::class,
            'data_envio' => 'datetime',
            'data_resposta' => 'datetime',
        ];
    }

    /**
     * Recalcula o valor total a partir dos itens.
     */
    public function recalcularTotal(): void
    {
        $this->valor_total = $this->itens()->sum(DB::raw('quantidade * valor_unitario'));
        $this->save();
    }

    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ItemOrcamento::class);
    }
}
