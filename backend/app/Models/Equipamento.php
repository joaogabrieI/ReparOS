<?php

namespace App\Models;

use App\Models\Concerns\RegistraAtividade;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Equipamento extends Model
{
    use HasFactory, RegistraAtividade;

    protected $fillable = [
        'cliente_id',
        'tipo',
        'marca',
        'modelo',
        'numero_serie',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'criado_por_id');
    }

    public function assistenciaId(): int
    {
        return $this->cliente->assistencia_id;
    }

    public function descricaoAuditoria(): string
    {
        return trim("o equipamento {$this->tipo} {$this->marca} {$this->modelo}");
    }

    public function ordensServico(): HasMany
    {
        return $this->hasMany(OrdemServico::class);
    }
}
