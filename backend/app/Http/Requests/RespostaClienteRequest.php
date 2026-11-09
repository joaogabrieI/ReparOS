<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Resposta ao orçamento dada pelo próprio cliente na tela de acompanhamento, sem login (RF12).
 * O código vem do link enviado pelo WhatsApp.
 */
class RespostaClienteRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'codigo' => ['required', 'string', 'max:64'],
            'aprovado' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.required' => 'Use o link enviado pela assistência para responder ao orçamento.',
            'codigo.string' => 'Use o link enviado pela assistência para responder ao orçamento.',
            'codigo.max' => 'Use o link enviado pela assistência para responder ao orçamento.',
            'aprovado.required' => 'Informe se você aprova ou recusa o orçamento.',
            'aprovado.boolean' => 'Informe se você aprova ou recusa o orçamento.',
        ];
    }
}
