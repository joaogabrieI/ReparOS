<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Dados do cliente no cadastro e na edição (RF01, RF03, RF04).
 */
class ClienteRequest extends FormRequest
{
    /**
     * Na edição, o cliente precisa ser do técnico logado.
     */
    public function authorize(): bool
    {
        $cliente = $this->route('cliente');

        return ! $cliente || $cliente->tecnico_id === $this->user()->id;
    }

    /**
     * Cliente de outro técnico responde como se não existisse.
     */
    protected function failedAuthorization(): void
    {
        abort(404, 'Cliente não encontrado.');
    }

    /**
     * O telefone é guardado só com DDD e número, para que "(11) 98888-7777",
     * "11988887777" e "+55 11 98888-7777" sejam reconhecidos como o mesmo WhatsApp.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'nome' => is_string($this->nome) ? trim($this->nome) : $this->nome,
            'telefone_whatsapp' => is_string($this->telefone_whatsapp)
                ? self::normalizarTelefone($this->telefone_whatsapp)
                : $this->telefone_whatsapp,
            'endereco' => is_string($this->endereco) ? trim($this->endereco) : $this->endereco,
        ]);
    }

    public static function normalizarTelefone(string $telefone): string
    {
        $digitos = preg_replace('/\D/', '', $telefone);

        return strlen($digitos) > 11 && str_starts_with($digitos, '55') ? substr($digitos, 2) : $digitos;
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'telefone_whatsapp' => [
                'required',
                'string',
                'between:10,11',
                // Único dentro do técnico logado; na edição ignora o próprio cliente.
                Rule::unique('clientes')
                    ->where('tecnico_id', $this->user()->id)
                    ->ignore($this->route('cliente')),
            ],
            'endereco' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o nome do cliente.',
            'nome.max' => 'O nome pode ter no máximo 255 caracteres.',
            'telefone_whatsapp.required' => 'Informe o telefone (WhatsApp).',
            'telefone_whatsapp.between' => 'Informe o telefone com DDD, 10 ou 11 dígitos.',
            'telefone_whatsapp.unique' => 'Já existe um cliente com este telefone.',
            'endereco.required' => 'Informe o endereço.',
            'endereco.max' => 'O endereço pode ter no máximo 255 caracteres.',
        ];
    }
}
