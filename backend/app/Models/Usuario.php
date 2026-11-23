<?php

namespace App\Models;

use App\Enums\PerfilUsuario;
use App\Support\Auditoria;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

/**
 * Pessoa que entra no sistema. Pertence a uma assistência e enxerga só os dados dela.
 * Nunca é apagado: ao sair da equipe, é desativado e perde o acesso.
 */
class Usuario extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios';

    protected $fillable = [
        'assistencia_id',
        'nome',
        'email',
        'password',
        'perfil',
        'ativo',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['perfil_rotulo'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'perfil' => PerfilUsuario::class,
            'ativo' => 'boolean',
            'ultimo_acesso_em' => 'datetime',
        ];
    }

    /**
     * Cadastro público: cria a assistência e o primeiro usuário, que já nasce admin.
     *
     * @param  array{nome: string, nome_assistencia: string, telefone?: ?string, email: string, password: string}  $dados
     */
    public static function criarComAssistencia(array $dados): self
    {
        return DB::transaction(function () use ($dados) {
            $assistencia = Assistencia::create([
                'nome' => $dados['nome_assistencia'],
                'telefone' => $dados['telefone'] ?? null,
            ]);

            return $assistencia->usuarios()->create([
                'nome' => $dados['nome'],
                'email' => $dados['email'],
                'password' => $dados['password'],
                'perfil' => PerfilUsuario::Admin,
            ]);
        });
    }

    public function admin(): bool
    {
        return $this->perfil === PerfilUsuario::Admin;
    }

    public function getPerfilRotuloAttribute(): ?string
    {
        return $this->perfil?->rotulo();
    }

    public function assistencia(): BelongsTo
    {
        return $this->belongsTo(Assistencia::class);
    }

    /**
     * Clientes da assistência do usuário (atalho usado nas consultas e no cadastro).
     */
    public function clientes(): HasMany
    {
        return $this->assistencia->clientes();
    }

    public function aceitesTermos(): HasMany
    {
        return $this->hasMany(AceiteTermos::class);
    }

    public function ultimoAceiteTermos(): ?AceiteTermos
    {
        return $this->aceitesTermos()->latest('aceito_em')->latest('id')->first();
    }

    /**
     * Verdadeiro quando o usuário ainda não aceitou as versões em vigor dos Termos de uso e da
     * Política de privacidade: no primeiro acesso de quem o admin criou ou quando um texto muda.
     */
    public function termosPendentes(): bool
    {
        return ! $this->aceitesTermos()->where(AceiteTermos::versoesAtuais())->exists();
    }

    /**
     * Grava o aceite das versões em vigor, com data e hora, IP e navegador, e deixa no registro de atividade.
     */
    public function registrarAceiteTermos(?Request $request = null): AceiteTermos
    {
        $versoes = AceiteTermos::versoesAtuais();

        $aceite = $this->aceitesTermos()->create($versoes + [
            'ip' => $request?->ip(),
            'navegador' => $request?->userAgent() ? mb_substr($request->userAgent(), 0, 500) : null,
        ]);

        Auditoria::registrar($this->assistencia_id, 'aceitou_termos', 'usuario', $this->id,
            "{$this->nome} aceitou os Termos de uso (v{$versoes['versao_termos']}) e a Política de privacidade (v{$versoes['versao_privacidade']})",
            null, $versoes, usuario: $this);

        return $aceite;
    }

    /**
     * Dados do usuário logado para o frontend, com a assistência e se falta aceitar os termos.
     * termos_atualizados = já tinha aceitado uma versão anterior (o texto da tela de aceite muda).
     */
    public function paraSessao(): array
    {
        $pendentes = $this->termosPendentes();

        return $this->load('assistencia')->toArray() + [
            'termos_pendentes' => $pendentes,
            'termos_atualizados' => $pendentes && $this->aceitesTermos()->exists(),
        ];
    }

    public function ordensResponsavel(): HasMany
    {
        return $this->hasMany(OrdemServico::class, 'responsavel_id');
    }
}
