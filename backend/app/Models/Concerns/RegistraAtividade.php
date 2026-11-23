<?php

namespace App\Models\Concerns;

use App\Support\Auditoria;
use Illuminate\Support\Str;

/**
 * Guarda quem criou o registro (criado_por_id) e grava no registro de atividade cada criação e alteração,
 * só com os campos que mudaram.
 */
trait RegistraAtividade
{
    /**
     * Motivo opcional da próxima alteração (por exemplo, a correção de uma OS), gravado no registro de atividade.
     */
    public ?string $motivoAlteracao = null;

    public static function bootRegistraAtividade(): void
    {
        static::creating(function (self $modelo) {
            $modelo->criado_por_id ??= Auditoria::usuarioId();
        });

        static::created(function (self $modelo) {
            $dados = array_diff_key($modelo->getAttributes(), array_flip($modelo->camposForaDaAuditoria()));
            Auditoria::registrar($modelo->assistenciaId(), 'criou', $modelo->entidadeAuditoria(), $modelo->getKey(),
                'Criou '.$modelo->descricaoAuditoria(), null, $dados);
        });

        static::updated(function (self $modelo) {
            $mudou = array_diff_key($modelo->getChanges(), array_flip($modelo->camposForaDaAuditoria()));
            if ($mudou === []) {
                return;
            }

            $antes = array_intersect_key($modelo->getRawOriginal(), $mudou);
            $motivo = filled($modelo->motivoAlteracao) ? ". Motivo: {$modelo->motivoAlteracao}" : '';
            Auditoria::registrar($modelo->assistenciaId(), 'alterou', $modelo->entidadeAuditoria(), $modelo->getKey(),
                'Alterou '.$modelo->descricaoAuditoria().$motivo, $antes, $mudou);
        });
    }

    /**
     * Campos que não valem um registro (datas automáticas e o que já vai para o histórico da OS).
     *
     * @return list<string>
     */
    protected function camposForaDaAuditoria(): array
    {
        return ['created_at', 'updated_at', 'criado_por_id', ...($this->naoAuditar ?? [])];
    }

    public function entidadeAuditoria(): string
    {
        return Str::snake(class_basename($this));
    }

    abstract public function assistenciaId(): int;

    abstract public function descricaoAuditoria(): string;
}
