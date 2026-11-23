<?php

namespace App\Models;

use App\Models\Concerns\RegistraAtividade;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Cliente extends Model
{
    use HasFactory, RegistraAtividade;

    protected $fillable = [
        'assistencia_id',
        'nome',
        'telefone_whatsapp',
        'endereco',
    ];

    public function assistencia(): BelongsTo
    {
        return $this->belongsTo(Assistencia::class);
    }

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'criado_por_id');
    }

    public function assistenciaId(): int
    {
        return $this->assistencia_id;
    }

    public function descricaoAuditoria(): string
    {
        return "o cliente {$this->nome}";
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
