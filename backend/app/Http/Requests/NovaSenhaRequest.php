<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidaSenha;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Nova senha pelo link de recuperação enviado por e-mail.
 */
class NovaSenhaRequest extends FormRequest
{
    use ValidaSenha;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->email) ? mb_strtolower(trim($this->email)) : $this->email,
        ]);
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => $this->regrasSenha(),
            'sair_outros' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'Link de recuperação inválido. Peça um novo link.',
            'email.required' => 'Informe o e-mail.',
            'email.email' => 'Informe um e-mail válido.',
        ] + $this->mensagensSenha();
    }
}
