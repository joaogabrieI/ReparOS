<?php

namespace App\Http\Requests;

use App\Enums\TipoItemOrcamento;
use App\Http\Requests\Concerns\ExigeOsDoTecnico;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Orçamento da OS: itens de serviço e de peça, prazo e validade (RF11; CDC art. 40).
 */
class OrcamentoRequest extends FormRequest
{
    use ExigeOsDoTecnico;

    protected function prepareForValidation(): void
    {
        $itens = $this->input('itens');

        if (is_array($itens)) {
            $this->merge(['itens' => array_map(
                fn ($item) => is_array($item) && is_string($item['descricao'] ?? null)
                    ? ['descricao' => trim($item['descricao'])] + $item
                    : $item,
                $itens,
            )]);
        }
    }

    public function rules(): array
    {
        return [
            'prazo_dias' => ['required', 'integer', 'between:1,365'],
            'validade_dias' => ['sometimes', 'integer', 'between:1,90'],
            'itens' => ['required', 'array', 'min:1', 'max:50'],
            'itens.*.tipo' => ['required', Rule::in(TipoItemOrcamento::valores())],
            'itens.*.descricao' => ['required', 'string', 'max:255'],
            'itens.*.quantidade' => ['required', 'integer', 'between:1,999'],
            'itens.*.valor_unitario' => ['required', 'numeric', 'min:0', 'max:999999.99', 'decimal:0,2'],
        ];
    }

    public function messages(): array
    {
        return [
            'prazo_dias.required' => 'Informe o prazo de entrega em dias úteis.',
            'prazo_dias.integer' => 'O prazo deve ser um número de dias.',
            'prazo_dias.between' => 'O prazo deve ficar entre 1 e 365 dias úteis.',
            'validade_dias.integer' => 'A validade deve ser um número de dias.',
            'validade_dias.between' => 'A validade deve ficar entre 1 e 90 dias.',
            'itens.required' => 'Inclua ao menos um item no orçamento.',
            'itens.min' => 'Inclua ao menos um item no orçamento.',
            'itens.max' => 'O orçamento pode ter no máximo 50 itens.',
            'itens.*.tipo.required' => 'Informe se o item é peça ou serviço.',
            'itens.*.tipo.in' => 'O item deve ser peça ou serviço.',
            'itens.*.descricao.required' => 'Descreva o item.',
            'itens.*.descricao.max' => 'A descrição pode ter no máximo 255 caracteres.',
            'itens.*.quantidade.required' => 'Informe a quantidade.',
            'itens.*.quantidade.integer' => 'A quantidade deve ser um número inteiro.',
            'itens.*.quantidade.between' => 'A quantidade deve ficar entre 1 e 999.',
            'itens.*.valor_unitario.required' => 'Informe o valor do item.',
            'itens.*.valor_unitario.numeric' => 'Informe um valor válido.',
            'itens.*.valor_unitario.min' => 'O valor não pode ser negativo.',
            'itens.*.valor_unitario.max' => 'O valor pode ser no máximo R$ 999.999,99.',
            'itens.*.valor_unitario.decimal' => 'Use no máximo duas casas decimais.',
        ];
    }
}
