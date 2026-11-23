<?php

namespace App\Http\Requests;

use App\Enums\StatusOrdemServico;
use App\Http\Requests\Concerns\ExigeOsDaAssistencia;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Volta da OS para a etapa anterior. O motivo é obrigatório porque fica no histórico, que o cliente
 * e a equipe consultam. `status_atual` é a etapa que o usuário via na tela, para um clique duplo
 * ou uma tela desatualizada não voltarem duas etapas.
 */
class VoltarEtapaRequest extends FormRequest
{
    use ExigeOsDaAssistencia;

    protected function prepareForValidation(): void
    {
        $motivo = $this->input('motivo');

        $this->merge(['motivo' => is_string($motivo) ? trim($motivo) : $motivo]);
    }

    public function rules(): array
    {
        return [
            'motivo' => ['required', 'string', 'max:500'],
            'status_atual' => ['nullable', Rule::enum(StatusOrdemServico::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'motivo.required' => 'Informe o motivo para voltar a etapa.',
            'motivo.max' => 'O motivo pode ter no máximo 500 caracteres.',
            'status_atual.enum' => 'Status inválido.',
        ];
    }
}
