<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidaAceiteTermos;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Aceite feito depois do login: usuário criado pelo admin (primeiro acesso) ou termos em nova versão.
 */
class AceiteTermosRequest extends FormRequest
{
    use ValidaAceiteTermos;

    public function rules(): array
    {
        return $this->regrasAceiteTermos();
    }

    public function messages(): array
    {
        return $this->mensagensAceiteTermos();
    }
}
