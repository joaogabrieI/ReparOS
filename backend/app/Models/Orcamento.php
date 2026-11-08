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
        'prazo_dias',
        'prazo_entrega',
        'situacao',
        'validade_dias',
        'validade_ate',
        'data_envio',
        'data_resposta',
        'canal_resposta',
    ];

    /**
     * Canais em que o cliente pode responder ao orçamento.
     */
    public const CANAIS = ['whatsapp', 'telefone', 'presencial'];

    protected $appends = ['vencido'];

    protected function casts(): array
    {
        return [
            'valor_total' => 'decimal:2',
            'prazo_dias' => 'integer',
            'prazo_entrega' => 'date',
            'situacao' => SituacaoOrcamento::class,
            'validade_dias' => 'integer',
            'validade_ate' => 'date',
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

    /**
     * Orçamento enviado, ainda sem resposta e com a validade já passada (CDC art. 40, §1º).
     */
    public function getVencidoAttribute(): bool
    {
        return $this->situacao === SituacaoOrcamento::Pendente
            && $this->validade_ate !== null
            && $this->validade_ate->lt(today());
    }

    /**
     * Itens e valores só mudam antes do envio: depois disso, o cliente já tem o orçamento em mãos.
     */
    public function editavel(): bool
    {
        return $this->data_envio === null;
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
