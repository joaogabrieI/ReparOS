<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Rules\Password;

/**
 * Regra de senha do técnico, usada no cadastro e na nova senha: 8 ou mais caracteres,
 * com pelo menos uma letra, um número e um caractere especial.
 */
trait ValidaSenha
{
    protected function regrasSenha(): array
    {
        return ['required', 'string', 'confirmed', 'max:255', Password::min(8)->letters()->numbers()->symbols()];
    }

    protected function mensagensSenha(): array
    {
        return [
            'password.required' => 'Informe a senha.',
            'password.confirmed' => 'As senhas não coincidem.',
            'password.max' => 'A senha pode ter no máximo 255 caracteres.',
            'password.min' => 'A senha precisa ter pelo menos 8 caracteres.',
            'password.password.letters' => 'A senha precisa ter pelo menos uma letra.',
            'password.password.numbers' => 'A senha precisa ter pelo menos um número.',
            'password.password.symbols' => 'A senha precisa ter pelo menos um caractere especial.',
        ];
    }
}
