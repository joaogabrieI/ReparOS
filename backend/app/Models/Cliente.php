<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Cliente extends Model
{
    use HasFactory;

    protected $fillable = [
        'tecnico_id',
        'nome',
        'telefone_whatsapp',
        'endereco',
    ];

    public function tecnico(): BelongsTo
    {
        return $this->belongsTo(Tecnico::class);
    }

    public function equipamentos(): HasMany
    {
        return $this->hasMany(Equipamento::class);
    }

    /**
     * Toda OS chega ao cliente pelo equipamento.
     */
    public function ordensServico(): HasManyThrough
    {
        return $this->hasManyThrough(OrdemServico::class, Equipamento::class);
    }
}
