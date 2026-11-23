<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Registro de quem fez cada ação (ISO 27002 8.15). Como o histórico da OS, só aceita inserção.
 */
class RegistroAtividade extends Model
{
    protected $table = 'registros_atividade';

    public const UPDATED_AT = null;

    protected $fillable = [
        'assistencia_id',
        'usuario_id',
        'acao',
        'entidade',
        'entidade_id',
        'descricao',
        'dados_anteriores',
        'dados_novos',
        'ip',
    ];

    protected function casts(): array
    {
        return [
            'dados_anteriores' => 'array',
            'dados_novos' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('O registro de atividade não pode ser alterado.'));
        static::deleting(fn () => throw new LogicException('O registro de atividade não pode ser apagado.'));
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
