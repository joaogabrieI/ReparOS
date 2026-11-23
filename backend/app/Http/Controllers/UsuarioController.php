<?php

namespace App\Http\Controllers;

use App\Enums\PerfilUsuario;
use App\Http\Requests\UsuarioRequest;
use App\Models\Usuario;
use App\Support\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Usuários da assistência. Todos veem a lista (para escolher o técnico responsável pela OS);
 * só o admin cria, edita, muda o perfil, desativa e reativa. Usuário nunca é apagado.
 * A assistência sempre mantém pelo menos um admin ativo.
 */
class UsuarioController extends Controller
{
    /**
     * Filtro opcional: `ativos=1` traz só os ativos.
     */
    public function index(Request $request): JsonResponse
    {
        $usuarios = $request->user()->assistencia->usuarios()
            ->when($request->boolean('ativos'), fn ($query) => $query->where('ativo', true))
            ->orderByDesc('ativo')
            ->orderBy('nome')
            ->get(['id', 'nome', 'email', 'perfil', 'ativo', 'ultimo_acesso_em', 'created_at']);

        return response()->json($usuarios);
    }

    public function store(UsuarioRequest $request): JsonResponse
    {
        $usuario = $request->user()->assistencia->usuarios()->create($request->validated());

        Auditoria::registrar($usuario->assistencia_id, 'criou_usuario', 'usuario', $usuario->id,
            "Criou o usuário {$usuario->nome} ({$usuario->perfil_rotulo})", null, $usuario->only('nome', 'email', 'perfil'));

        return response()->json($usuario->refresh(), 201);
    }

    public function update(UsuarioRequest $request, Usuario $usuario): JsonResponse
    {
        $this->garantirMesmaAssistencia($request, $usuario);

        $dados = $request->validated();
        $rebaixando = $usuario->admin() && $dados['perfil'] !== PerfilUsuario::Admin->value;

        DB::transaction(function () use ($usuario, $dados, $rebaixando) {
            if ($rebaixando && $usuario->ativo) {
                $this->garantirOutroAdmin($usuario, 'Não é possível tirar o perfil de administrador do último admin ativo.');
            }

            $antes = $usuario->only('nome', 'email', 'perfil');
            $usuario->fill($dados)->save();

            $mudou = array_keys($usuario->getChanges());
            if (in_array('password', $mudou, true)) {
                // Senha trocada pelo admin: as sessões abertas do usuário são encerradas.
                $usuario->tokens()->delete();
            }

            Auditoria::registrar($usuario->assistencia_id, 'alterou_usuario', 'usuario', $usuario->id,
                "Alterou o usuário {$usuario->nome}".(in_array('password', $mudou, true) ? ' (nova senha)' : ''),
                $antes, $usuario->only('nome', 'email', 'perfil'));
        });

        return response()->json($usuario->refresh());
    }

    /**
     * Desativa o acesso: o usuário sai de todas as sessões na hora e não entra mais.
     * O histórico do que ele fez continua com o nome dele.
     */
    public function desativar(Request $request, Usuario $usuario): JsonResponse
    {
        $this->garantirMesmaAssistencia($request, $usuario);
        abort_unless($usuario->ativo, 422, 'Este usuário já está desativado.');

        DB::transaction(function () use ($usuario) {
            if ($usuario->admin()) {
                $this->garantirOutroAdmin($usuario, 'Não é possível desativar o último admin ativo da assistência.');
            }

            $usuario->forceFill(['ativo' => false])->save();
            $usuario->tokens()->delete();

            Auditoria::registrar($usuario->assistencia_id, 'desativou_usuario', 'usuario', $usuario->id,
                "Desativou o usuário {$usuario->nome}", ['ativo' => true], ['ativo' => false]);
        });

        return response()->json($usuario->refresh());
    }

    public function reativar(Request $request, Usuario $usuario): JsonResponse
    {
        $this->garantirMesmaAssistencia($request, $usuario);
        abort_if($usuario->ativo, 422, 'Este usuário já está ativo.');

        $usuario->forceFill(['ativo' => true])->save();

        Auditoria::registrar($usuario->assistencia_id, 'reativou_usuario', 'usuario', $usuario->id,
            "Reativou o usuário {$usuario->nome}", ['ativo' => false], ['ativo' => true]);

        return response()->json($usuario->refresh());
    }

    /**
     * Usuário de outra assistência responde como se não existisse.
     */
    private function garantirMesmaAssistencia(Request $request, Usuario $usuario): void
    {
        abort_unless($usuario->assistencia_id === $request->user()->assistencia_id, 404, 'Usuário não encontrado.');
    }

    /**
     * Trava os admins da assistência para dois pedidos ao mesmo tempo não desativarem os dois últimos.
     */
    private function garantirOutroAdmin(Usuario $usuario, string $mensagem): void
    {
        Usuario::where('assistencia_id', $usuario->assistencia_id)->where('perfil', PerfilUsuario::Admin)->lockForUpdate()->get(['id']);

        abort_if($usuario->assistencia->outrosAdminsAtivos($usuario) === 0, 422, $mensagem);
    }
}
