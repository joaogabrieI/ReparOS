<?php

namespace App\Http\Controllers;

use App\Enums\PerfilUsuario;
use App\Http\Requests\DesativacaoUsuarioRequest;
use App\Http\Requests\UsuarioRequest;
use App\Models\Usuario;
use App\Support\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Usuários da assistência. Todos veem a lista (para escolher o técnico responsável pela OS);
 * só o admin cria, edita, muda o perfil, desativa e reativa. Usuário nunca é apagado.
 * A assistência sempre mantém pelo menos um admin ativo.
 */
class UsuarioController extends Controller
{
    /**
     * Filtro opcional: `ativos=1` traz só os ativos. `ordens_em_andamento` conta as OS pendentes de que
     * cada um é responsável (a tela da Equipe usa ao desativar).
     */
    public function index(Request $request): JsonResponse
    {
        $usuarios = $request->user()->assistencia->usuarios()
            ->select(['id', 'nome', 'email', 'perfil', 'ativo', 'ultimo_acesso_em', 'created_at'])
            ->withCount(['ordensResponsavel as ordens_em_andamento' => fn ($query) => $query->pendentes()])
            ->when($request->boolean('ativos'), fn ($query) => $query->where('ativo', true))
            ->orderByDesc('ativo')
            ->orderBy('nome')
            ->get();

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
     *
     * Como só o responsável ou um admin altera a OS, as OS em andamento do usuário (as pendentes, inclusive
     * a cancelada que ainda espera a devolução) passam para quem o admin escolher em `transferir_para_id`,
     * na mesma transação. Sem destino, a desativação é recusada (422) e nada muda. Cada OS transferida
     * ganha um registro "alterou" com o responsável antes e depois e o motivo.
     */
    public function desativar(DesativacaoUsuarioRequest $request, Usuario $usuario): JsonResponse
    {
        abort_unless($usuario->ativo, 422, 'Este usuário já está desativado.');

        $destinoId = $request->validated('transferir_para_id');

        $transferidas = DB::transaction(function () use ($usuario, $destinoId) {
            if ($usuario->admin()) {
                $this->garantirOutroAdmin($usuario, 'Não é possível desativar o último admin ativo da assistência.');
            }

            // Trava as OS para ninguém trocar o responsável delas no meio da transferência.
            $ordens = $usuario->ordensResponsavel()->pendentes()->orderBy('id')->lockForUpdate()->get();

            if ($ordens->isNotEmpty() && ! $destinoId) {
                $quantas = $ordens->count() === 1 ? '1 OS em andamento' : "{$ordens->count()} OS em andamento";
                throw ValidationException::withMessages([
                    'transferir_para_id' => "{$usuario->nome} é responsável por {$quantas}. Escolha para quem transferir antes de desativar.",
                ]);
            }

            $destino = $ordens->isNotEmpty() ? Usuario::findOrFail($destinoId) : null;
            foreach ($ordens as $os) {
                $os->motivoAlteracao = "transferida para {$destino->nome} ao desativar {$usuario->nome}";
                $os->update(['responsavel_id' => $destino->id]);
            }

            $usuario->forceFill(['ativo' => false])->save();
            $usuario->tokens()->delete();

            $depois = ['ativo' => false];
            $descricao = "Desativou o usuário {$usuario->nome}";
            if ($destino) {
                $depois += ['os_transferidas' => $ordens->pluck('numero')->all(), 'transferidas_para_id' => $destino->id];
                $descricao .= ' e transferiu '.($ordens->count() === 1 ? '1 OS' : "{$ordens->count()} OS")." para {$destino->nome}";
            }

            Auditoria::registrar($usuario->assistencia_id, 'desativou_usuario', 'usuario', $usuario->id,
                $descricao, ['ativo' => true], $depois);

            return $ordens->count();
        });

        return response()->json($usuario->refresh()->toArray() + ['os_transferidas' => $transferidas]);
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
