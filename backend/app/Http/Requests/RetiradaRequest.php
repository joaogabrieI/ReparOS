<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Retirada do equipamento na casa do cliente (RF09). A observação guarda o estado do aparelho
 * e os acessórios recebidos, para conferir na devolução.
 */
class RetiradaRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    public function rules(): array
    {
        return [
            'data_retirada' => ['nullable', 'date', 'before_or_equal:now'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'data_retirada.date' => 'Informe uma data e um horário válidos.',
            'data_retirada.before_or_equal' => 'A retirada não pode estar no futuro.',
            'observacao.max' => 'A observação pode ter no máximo 500 caracteres.',
        ];
    }
}
