<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Reparo concluído: a OS fica pronta para o cliente retirar (RF14).
 */
class ProntoRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    public function rules(): array
    {
        return [
            'observacao' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'observacao.max' => 'A observação pode ter no máximo 500 caracteres.',
        ];
    }
}
