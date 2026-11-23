<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDaAssistencia;
use App\Models\Usuario;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Troca do técnico responsável pela OS.
 */
class ResponsavelRequest extends FormRequest
{
    use ExigeOsDaAssistencia;

    /**
     * O responsável precisa ser um usuário ativo da mesma assistência.
     */
    public static function regraUsuarioAtivo(Usuario $usuario): Exists
    {
        return Rule::exists('usuarios', 'id')
            ->where('assistencia_id', $usuario->assistencia_id)
            ->where('ativo', true);
    }

    public function rules(): array
    {
        return [
            'responsavel_id' => ['required', 'integer', self::regraUsuarioAtivo($this->user())],
        ];
    }

    public function messages(): array
    {
        return [
            'responsavel_id.required' => 'Escolha o técnico responsável.',
            'responsavel_id.integer' => 'Técnico responsável não encontrado.',
            'responsavel_id.exists' => 'Escolha um usuário ativo da assistência como responsável.',
        ];
    }
}
