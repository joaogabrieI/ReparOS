<?php

namespace App\Http\Requests;

use App\Enums\PerfilUsuario;
use App\Http\Requests\Concerns\ValidaSenha;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Usuário criado ou editado pelo admin. Na edição, a senha é opcional: só muda se for enviada.
 */
class UsuarioRequest extends FormRequest
{
    use ValidaSenha;

    public function authorize(): bool
    {
        $usuario = $this->route('usuario');

        return $this->user()->admin() && (! $usuario || $usuario->assistencia_id === $this->user()->assistencia_id);
    }

    /**
     * Técnico recebe 403; usuário de outra assistência responde como se não existisse.
     */
    protected function failedAuthorization(): void
    {
        abort($this->user()->admin() ? 404 : 403, $this->user()->admin() ? 'Usuário não encontrado.' : 'Só o administrador da assistência pode fazer isso.');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nome' => is_string($this->nome) ? trim($this->nome) : $this->nome,
            'email' => is_string($this->email) ? mb_strtolower(trim($this->email)) : $this->email,
        ]);

        // Na edição, senha em branco = manter a atual.
        if ($this->route('usuario') && blank($this->input('password'))) {
            $this->getInputSource()->remove('password');
            $this->getInputSource()->remove('password_confirmation');
        }
    }

    public function rules(): array
    {
        $edicao = $this->route('usuario') !== null;

        return [
            'nome' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('usuarios', 'email')->ignore($this->route('usuario'))],
            'perfil' => ['required', Rule::enum(PerfilUsuario::class)],
            'password' => $edicao ? ['sometimes', ...$this->regrasSenha()] : $this->regrasSenha(),
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o nome.',
            'nome.max' => 'O nome pode ter no máximo 255 caracteres.',
            'email.required' => 'Informe o e-mail.',
            'email.email' => 'Informe um e-mail válido.',
            'email.max' => 'O e-mail pode ter no máximo 255 caracteres.',
            'email.unique' => 'Já existe um usuário com este e-mail.',
            'perfil.required' => 'Escolha o perfil.',
            'perfil.enum' => 'O perfil deve ser Administrador ou Técnico.',
        ] + $this->mensagensSenha();
    }
}
