<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Diagnóstico da OS: causa do defeito e o que precisa ser feito (RF10).
 */
class DiagnosticoRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    protected function prepareForValidation(): void
    {
        $diagnostico = $this->input('diagnostico');

        $this->merge(['diagnostico' => is_string($diagnostico) ? trim($diagnostico) : $diagnostico]);
    }

    public function rules(): array
    {
        return [
            'diagnostico' => ['required', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'diagnostico.required' => 'Descreva o diagnóstico.',
            'diagnostico.max' => 'O diagnóstico pode ter no máximo 5000 caracteres.',
        ];
    }
}
