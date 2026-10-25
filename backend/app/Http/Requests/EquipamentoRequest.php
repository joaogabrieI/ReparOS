<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Dados do equipamento no cadastro e na edição (RF05, RF06).
 */
class EquipamentoRequest extends FormRequest
{
    /**
     * Os mesmos tipos oferecidos no formulário do frontend.
     */
    public const TIPOS = ['Smartphone', 'Tablet', 'Notebook', 'Videogame', 'Controle de videogame'];

    /**
     * Na edição, o equipamento precisa ser de um cliente do técnico logado.
     */
    public function authorize(): bool
    {
        $equipamento = $this->route('equipamento');

        return ! $equipamento || $equipamento->cliente->tecnico_id === $this->user()->id;
    }

    /**
     * Equipamento de outro técnico responde como se não existisse.
     */
    protected function failedAuthorization(): void
    {
        abort(404, 'Equipamento não encontrado.');
    }

    protected function prepareForValidation(): void
    {
        $campos = [];
        foreach (['tipo', 'marca', 'modelo', 'numero_serie'] as $campo) {
            $valor = $this->input($campo);
            $campos[$campo] = is_string($valor) ? (trim($valor) === '' ? null : trim($valor)) : $valor;
        }

        $this->merge($campos);
    }

    public function rules(): array
    {
        return [
            // Só no cadastro: depois de criado, o equipamento não muda de cliente.
            'cliente_id' => $this->route('equipamento')
                ? ['exclude']
                : [
                    'required',
                    'integer',
                    Rule::exists('clientes', 'id')->where('tecnico_id', $this->user()->id),
                ],
            'tipo' => ['required', 'string', Rule::in(self::TIPOS)],
            'marca' => ['required', 'string', 'max:255'],
            'modelo' => ['required', 'string', 'max:255'],
            'numero_serie' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'cliente_id.required' => 'Informe o cliente dono do equipamento.',
            'cliente_id.integer' => 'Cliente não encontrado.',
            'cliente_id.exists' => 'Cliente não encontrado.',
            'tipo.required' => 'Selecione o tipo do equipamento.',
            'tipo.in' => 'Selecione um tipo da lista.',
            'marca.required' => 'Informe a marca.',
            'marca.max' => 'A marca pode ter no máximo 255 caracteres.',
            'modelo.required' => 'Informe o modelo.',
            'modelo.max' => 'O modelo pode ter no máximo 255 caracteres.',
            'numero_serie.max' => 'O número de série pode ter no máximo 255 caracteres.',
        ];
    }
}
