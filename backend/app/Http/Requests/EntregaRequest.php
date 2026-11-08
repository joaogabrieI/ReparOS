<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Entrega do equipamento ao cliente, consertado ou devolvido sem reparo (RF15).
 * A observação registra, por exemplo, quem recebeu e os acessórios devolvidos.
 */
class EntregaRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    public function rules(): array
    {
        return [
            'data_entrega' => ['nullable', 'date', 'before_or_equal:now'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'data_entrega.date' => 'Informe uma data e um horário válidos.',
            'data_entrega.before_or_equal' => 'A entrega não pode estar no futuro.',
            'observacao.max' => 'A observação pode ter no máximo 500 caracteres.',
        ];
    }
}
