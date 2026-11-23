<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDaAssistencia;
use App\Http\Requests\Concerns\ValidaDevolucao;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Reparo concluído: a OS fica pronta para o cliente retirar ou para ser entregue no endereço dele (RF14).
 * Aqui o usuário confirma ou troca a forma de devolução, com o endereço e a data quando for entrega.
 */
class ProntoRequest extends FormRequest
{
    use ExigeOsDaAssistencia, ValidaDevolucao;

    protected function prepareForValidation(): void
    {
        $this->prepararDevolucao();
    }

    public function rules(): array
    {
        return [
            'observacao' => ['nullable', 'string', 'max:500'],
            ...$this->regrasDevolucao(),
        ];
    }

    public function after(): array
    {
        return [fn (Validator $validator) => $this->conferirEnderecoDeEntrega($validator, $this->route('ordemServico'))];
    }

    /**
     * Retirada ou entrega escolhida neste passo (só os campos enviados).
     *
     * @return array<string, mixed>
     */
    public function devolucao(): array
    {
        return $this->safe()->only(['forma_devolucao', 'endereco_entrega', 'entrega_agendada']);
    }

    public function messages(): array
    {
        return [
            'observacao.max' => 'A observação pode ter no máximo 500 caracteres.',
            ...$this->mensagensDevolucao(),
        ];
    }
}
