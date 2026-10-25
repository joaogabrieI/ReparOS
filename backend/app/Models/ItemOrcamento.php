<?php

namespace App\Models;

use App\Enums\TipoItemOrcamento;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemOrcamento extends Model
{
    use HasFactory;

    protected $table = 'itens_orcamento';

    protected $fillable = [
        'orcamento_id',
        'tipo',
        'descricao',
        'quantidade',
        'valor_unitario',
    ];

    protected function casts(): array
    {
        return [
            'tipo' => TipoItemOrcamento::class,
            'quantidade' => 'integer',
            'valor_unitario' => 'decimal:2',
        ];
    }

    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }
}
