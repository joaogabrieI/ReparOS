<?php

namespace App\Support;

use App\Models\RegistroAtividade;
use App\Models\Usuario;
use Closure;
use Illuminate\Support\Facades\Auth;

/**
 * Grava o registro de atividade: quem fez, o quê, em qual registro, com o antes e o depois.
 * Senhas, tokens e o código do link do orçamento nunca entram nos dados gravados.
 */
class Auditoria
{
    public const CAMPOS_SENSIVEIS = ['password', 'remember_token', 'codigo_resposta'];

    private static bool $peloCliente = false;

    /**
     * Usuário que está fazendo a ação agora, ou nulo quando quem age é o cliente pela tela pública.
     */
    public static function usuario(): ?Usuario
    {
        if (self::$peloCliente) {
            return null;
        }

        $usuario = Auth::guard('sanctum')->user();

        return $usuario instanceof Usuario ? $usuario : null;
    }

    public static function usuarioId(): ?int
    {
        return self::usuario()?->id;
    }

    /**
     * Executa uma ação feita pelo próprio cliente (link do WhatsApp): nada fica no nome de um usuário,
     * mesmo que o navegador tenha um login da assistência aberto.
     */
    public static function peloCliente(Closure $acao): mixed
    {
        $antes = self::$peloCliente;
        self::$peloCliente = true;

        try {
            return $acao();
        } finally {
            self::$peloCliente = $antes;
        }
    }

    public static function registrar(
        int $assistenciaId,
        string $acao,
        string $entidade,
        ?int $entidadeId = null,
        ?string $descricao = null,
        ?array $antes = null,
        ?array $depois = null,
        Usuario|false|null $usuario = null,
    ): RegistroAtividade {
        // false = sem usuário de propósito; null = quem estiver logado.
        $usuarioId = $usuario === false ? null : ($usuario?->id ?? self::usuarioId());

        return RegistroAtividade::create([
            'assistencia_id' => $assistenciaId,
            'usuario_id' => $usuarioId,
            'acao' => $acao,
            'entidade' => $entidade,
            'entidade_id' => $entidadeId,
            'descricao' => $descricao,
            'dados_anteriores' => self::limpar($antes),
            'dados_novos' => self::limpar($depois),
            'ip' => app()->runningInConsole() && ! app()->runningUnitTests() ? null : request()?->ip(),
        ]);
    }

    private static function limpar(?array $dados): ?array
    {
        if ($dados === null) {
            return null;
        }

        $dados = array_diff_key($dados, array_flip(self::CAMPOS_SENSIVEIS));

        return $dados === [] ? null : $dados;
    }
}
