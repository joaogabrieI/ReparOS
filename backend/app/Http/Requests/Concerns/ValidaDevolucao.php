<?php

namespace App\Http\Requests\Concerns;

use App\Enums\FormaDevolucao;
use App\Models\Equipamento;
use App\Models\OrdemServico;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Escolha da forma de devolução (cliente retira ou entrega no endereço), usada na abertura, na edição,
 * ao marcar a OS como pronta e na entrega. Para entregar, a OS precisa de um endereço: o informado
 * ou, se nenhum for informado, o endereço do cadastro do cliente.
 */
trait ValidaDevolucao
{
    use ExigeDataFutura;

    protected function prepararDevolucao(): void
    {
        $endereco = $this->input('endereco_entrega');
        if (is_string($endereco)) {
            $this->merge(['endereco_entrega' => trim($endereco) === '' ? null : trim($endereco)]);
        }
        if ($this->has('entrega_agendada') && $this->input('entrega_agendada') === '') {
            $this->merge(['entrega_agendada' => null]);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    protected function regrasDevolucao(): array
    {
        return [
            'forma_devolucao' => ['sometimes', 'required', Rule::enum(FormaDevolucao::class)],
            'endereco_entrega' => ['sometimes', 'nullable', 'string', 'max:255'],
            'entrega_agendada' => ['sometimes', 'nullable', 'date'],
        ];
    }

    /**
     * Confere se a entrega tem endereço, considerando o que já está gravado na OS e o cadastro do cliente.
     */
    protected function conferirEnderecoDeEntrega(Validator $validator, ?OrdemServico $os, ?Equipamento $equipamento = null): void
    {
        $this->conferirDataFutura($validator, 'entrega_agendada', 'A entrega combinada não pode ser em uma data que já passou.', $os);

        if ($validator->errors()->hasAny(['forma_devolucao', 'endereco_entrega'])) {
            return;
        }

        $forma = $this->has('forma_devolucao')
            ? FormaDevolucao::tryFrom((string) $this->input('forma_devolucao'))
            : ($os?->forma_devolucao ?? FormaDevolucao::Retirada);

        if ($forma !== FormaDevolucao::Entrega) {
            return;
        }

        $endereco = $this->has('endereco_entrega') ? $this->input('endereco_entrega') : $os?->endereco_entrega;
        $cliente = ($equipamento ?? $os?->equipamento)?->cliente;

        if (blank($endereco) && blank($cliente?->endereco)) {
            $validator->errors()->add('endereco_entrega', 'Informe o endereço de entrega: o cliente não tem endereço no cadastro.');
        }
    }

    /**
     * @return array<string, string>
     */
    protected function mensagensDevolucao(): array
    {
        return [
            'forma_devolucao.required' => 'Escolha se o cliente retira o equipamento ou se ele será entregue.',
            'forma_devolucao.enum' => 'Escolha "retirada" (o cliente retira na assistência) ou "entrega" (no endereço do cliente).',
            'endereco_entrega.max' => 'O endereço de entrega pode ter no máximo 255 caracteres.',
            'entrega_agendada.date' => 'Informe uma data e um horário válidos para a entrega.',
        ];
    }
}
