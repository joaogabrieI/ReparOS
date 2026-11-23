<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Aceite dos Termos de uso e da Política de privacidade por um usuário. Serve de prova do
 * consentimento, por isso, como o registro de atividade, só aceita inserção.
 */
class AceiteTermos extends Model
{
    protected $table = 'aceites_termos';

    public const CREATED_AT = 'aceito_em';

    public const UPDATED_AT = null;

    protected $fillable = [
        'usuario_id',
        'versao_termos',
        'versao_privacidade',
        'ip',
        'navegador',
    ];

    protected function casts(): array
    {
        return [
            'aceito_em' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('O aceite dos termos não pode ser alterado.'));
        static::deleting(fn () => throw new LogicException('O aceite dos termos não pode ser apagado.'));
    }

    /**
     * Versões em vigor, no formato gravado (config/termos.php).
     *
     * @return array{versao_termos: string, versao_privacidade: string}
     */
    public static function versoesAtuais(): array
    {
        return [
            'versao_termos' => (string) config('termos.versao_termos'),
            'versao_privacidade' => (string) config('termos.versao_privacidade'),
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
