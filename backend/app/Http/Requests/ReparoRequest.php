<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Anotações do reparo: o que foi feito e quais peças foram trocadas (RF13).
 */
class ReparoRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    protected function prepareForValidation(): void
    {
        foreach (['servico_executado', 'pecas_trocadas'] as $campo) {
            $valor = $this->input($campo);
            if (is_string($valor)) {
                $this->merge([$campo => trim($valor) === '' ? null : trim($valor)]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'servico_executado' => ['required', 'string', 'max:5000'],
            'pecas_trocadas' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'servico_executado.required' => 'Descreva o serviço executado.',
            'servico_executado.max' => 'O serviço executado pode ter no máximo 5000 caracteres.',
            'pecas_trocadas.max' => 'As peças trocadas podem ter no máximo 2000 caracteres.',
        ];
    }
}
