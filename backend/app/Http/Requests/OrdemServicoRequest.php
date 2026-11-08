<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Abertura e edição da OS: equipamento, problema relatado e retirada combinada (RF07, RF08).
 */
class OrdemServicoRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    protected function prepareForValidation(): void
    {
        $problema = $this->input('problema_relatado');

        $this->merge([
            'problema_relatado' => is_string($problema) ? trim($problema) : $problema,
            'retirada_agendada' => $this->input('retirada_agendada') === '' ? null : $this->input('retirada_agendada'),
        ]);
    }

    public function rules(): array
    {
        return [
            // Só na abertura: depois de aberta, a OS não muda de equipamento.
            'equipamento_id' => $this->route('ordemServico')
                ? ['exclude']
                : [
                    'required',
                    'integer',
                    Rule::exists('equipamentos', 'id')->where(fn ($query) => $query->whereIn(
                        'cliente_id',
                        $this->user()->clientes()->select('id'),
                    )),
                ],
            'problema_relatado' => ['required', 'string', 'max:2000'],
            'retirada_agendada' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'equipamento_id.required' => 'Selecione o equipamento.',
            'equipamento_id.integer' => 'Equipamento não encontrado.',
            'equipamento_id.exists' => 'Equipamento não encontrado.',
            'problema_relatado.required' => 'Descreva o problema relatado pelo cliente.',
            'problema_relatado.max' => 'O problema relatado pode ter no máximo 2000 caracteres.',
            'retirada_agendada.date' => 'Informe uma data e um horário válidos para a retirada.',
        ];
    }
}
