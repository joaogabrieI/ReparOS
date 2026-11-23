<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Desativação de um usuário pelo admin. Se ele for responsável por OS em andamento, o admin escolhe
 * para quem elas vão (`transferir_para_id`): outro usuário ativo da mesma assistência.
 */
class DesativacaoUsuarioRequest extends FormRequest
{
    /**
     * Usuário de outra assistência responde como se não existisse (o perfil admin já é conferido na rota).
     */
    public function authorize(): bool
    {
        return $this->route('usuario')->assistencia_id === $this->user()->assistencia_id;
    }

    protected function failedAuthorization(): void
    {
        abort(404, 'Usuário não encontrado.');
    }

    public function rules(): array
    {
        return [
            'transferir_para_id' => [
                'nullable',
                'integer',
                ResponsavelRequest::regraUsuarioAtivo($this->user())->whereNot('id', $this->route('usuario')->id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'transferir_para_id.integer' => 'Usuário de destino não encontrado.',
            'transferir_para_id.exists' => 'Escolha outro usuário ativo da assistência para receber as OS.',
        ];
    }
}
