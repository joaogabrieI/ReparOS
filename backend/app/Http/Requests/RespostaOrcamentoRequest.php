<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use App\Models\Orcamento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Resposta do cliente ao orçamento: aprovação ou recusa e o canal em que respondeu (RF12; CDC art. 39, VI).
 */
class RespostaOrcamentoRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    public function rules(): array
    {
        return [
            'aprovado' => ['required', 'boolean'],
            'canal' => ['required', Rule::in(Orcamento::CANAIS)],
            'observacao' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'aprovado.required' => 'Informe se o cliente aprovou ou recusou o orçamento.',
            'aprovado.boolean' => 'Informe se o cliente aprovou ou recusou o orçamento.',
            'canal.required' => 'Informe por onde o cliente respondeu.',
            'canal.in' => 'O canal deve ser WhatsApp, telefone ou presencial.',
            'observacao.max' => 'A observação pode ter no máximo 500 caracteres.',
        ];
    }
}
