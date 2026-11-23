<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ExigeOsDaAssistencia;
use App\Http\Requests\Concerns\ValidaDevolucao;
use App\Models\Equipamento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Abertura da OS: equipamento, problema relatado, retirada combinada (RF07) e o técnico responsável
 * (quem abre, se nenhum for escolhido). Já pode dizer se o equipamento volta por retirada na assistência (padrão)
 * ou por entrega no endereço do cliente; isso também pode ser decidido depois. A edição usa EdicaoOrdemServicoRequest.
 */
class OrdemServicoRequest extends FormRequest
{
    use ExigeOsDaAssistencia, ValidaDevolucao;

    protected function prepareForValidation(): void
    {
        $problema = $this->input('problema_relatado');

        $this->merge([
            'problema_relatado' => is_string($problema) ? trim($problema) : $problema,
            'retirada_agendada' => $this->input('retirada_agendada') === '' ? null : $this->input('retirada_agendada'),
        ]);
        $this->prepararDevolucao();
    }

    public function rules(): array
    {
        return [
            'equipamento_id' => [
                'required',
                'integer',
                Rule::exists('equipamentos', 'id')->where(fn ($query) => $query->whereIn(
                    'cliente_id',
                    $this->user()->clientes()->select('id'),
                )),
            ],
            'responsavel_id' => ['nullable', 'integer', ResponsavelRequest::regraUsuarioAtivo($this->user())],
            'problema_relatado' => ['required', 'string', 'max:2000'],
            'retirada_agendada' => ['nullable', 'date'],
            ...$this->regrasDevolucao(),
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $this->conferirDataFutura($validator, 'retirada_agendada', 'A retirada combinada não pode ser em uma data que já passou.');
                if (! $validator->errors()->has('equipamento_id')) {
                    $this->conferirEnderecoDeEntrega($validator, null, Equipamento::with('cliente')->find($this->input('equipamento_id')));
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'equipamento_id.required' => 'Selecione o equipamento.',
            'equipamento_id.integer' => 'Equipamento não encontrado.',
            'equipamento_id.exists' => 'Equipamento não encontrado.',
            'responsavel_id.integer' => 'Técnico responsável não encontrado.',
            'responsavel_id.exists' => 'Escolha um usuário ativo da assistência como responsável.',
            'problema_relatado.required' => 'Descreva o problema relatado pelo cliente.',
            'problema_relatado.max' => 'O problema relatado pode ter no máximo 2000 caracteres.',
            'retirada_agendada.date' => 'Informe uma data e um horário válidos para a retirada.',
            ...$this->mensagensDevolucao(),
        ];
    }
}
