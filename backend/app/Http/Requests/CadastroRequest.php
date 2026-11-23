<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidaAceiteTermos;
use App\Http\Requests\Concerns\ValidaSenha;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Cadastro da assistência e do primeiro usuário, que é o admin dela.
 * Exige o aceite dos Termos de uso e da Política de privacidade nas versões em vigor.
 */
class CadastroRequest extends FormRequest
{
    use ValidaAceiteTermos, ValidaSenha;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nome' => is_string($this->nome) ? trim($this->nome) : $this->nome,
            'nome_assistencia' => is_string($this->nome_assistencia) ? trim($this->nome_assistencia) : $this->nome_assistencia,
            'telefone' => is_string($this->telefone) ? ClienteRequest::normalizarTelefone($this->telefone) : $this->telefone,
            'email' => is_string($this->email) ? mb_strtolower(trim($this->email)) : $this->email,
        ]);
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'nome_assistencia' => ['required', 'string', 'max:255'],
            'telefone' => ['required', 'string', 'between:10,11'],
            'email' => ['required', 'email', 'max:255', 'unique:usuarios,email'],
            'password' => $this->regrasSenha(),
        ] + $this->regrasAceiteTermos();
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o seu nome.',
            'nome.max' => 'O nome pode ter no máximo 255 caracteres.',
            'nome_assistencia.required' => 'Informe o nome da assistência.',
            'nome_assistencia.max' => 'O nome da assistência pode ter no máximo 255 caracteres.',
            'telefone.required' => 'Informe o WhatsApp da loja.',
            'telefone.between' => 'Informe o telefone com DDD, 10 ou 11 dígitos.',
            'email.required' => 'Informe o e-mail.',
            'email.email' => 'Informe um e-mail válido.',
            'email.max' => 'O e-mail pode ter no máximo 255 caracteres.',
            'email.unique' => 'Já existe uma conta com este e-mail.',
        ] + $this->mensagensSenha() + $this->mensagensAceiteTermos();
    }
}
