<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDaAssistencia;
use App\Http\Requests\Concerns\ValidaDevolucao;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Entrega do equipamento ao cliente, consertado ou devolvido sem reparo (RF15).
 * Pode confirmar ou trocar a forma de devolução (retirada na assistência ou entrega no endereço).
 * A observação registra, por exemplo, quem recebeu e os acessórios devolvidos.
 */
class EntregaRequest extends FormRequest
{
    use ExigeOsDaAssistencia, ValidaDevolucao;

    protected function prepareForValidation(): void
    {
        $this->prepararDevolucao();
    }

    public function rules(): array
    {
        return [
            'data_entrega' => ['nullable', 'date', 'before_or_equal:now'],
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
            'data_entrega.date' => 'Informe uma data e um horário válidos.',
            'data_entrega.before_or_equal' => 'A entrega não pode estar no futuro.',
            'observacao.max' => 'A observação pode ter no máximo 500 caracteres.',
            ...$this->mensagensDevolucao(),
        ];
    }
}
