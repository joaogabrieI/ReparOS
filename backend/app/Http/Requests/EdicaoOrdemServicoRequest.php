<?php

namespace App\Http\Requests;

use App\Enums\StatusOrdemServico as S;
use App\Http\Requests\Concerns\ExigeOsDaAssistencia;
use App\Http\Requests\Concerns\ValidaDevolucao;
use BackedEnum;
use App\Models\OrdemServico;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Edição da OS (RF08): corrige os dados já registrados sem mexer no status. Só os campos enviados mudam,
 * e cada campo só pode ser corrigido nas etapas em que faz sentido. O que mudou, o antes, o depois,
 * quem alterou e o motivo vão para o registro de atividade. OS entregue não é editada: volte a etapa antes.
 */
class EdicaoOrdemServicoRequest extends FormRequest
{
    use ExigeOsDaAssistencia, ValidaDevolucao;

    /**
     * Etapas em que cada campo pode ser corrigido.
     */
    public const ETAPAS_POR_CAMPO = [
        // Equipamento e retirada combinada só antes do diagnóstico: depois disso o aparelho já foi examinado.
        'equipamento_id' => [S::Aberta, S::AguardandoDiagnostico],
        'retirada_agendada' => [S::Aberta, S::AguardandoDiagnostico],
        'problema_relatado' => [S::Aberta, S::AguardandoDiagnostico, S::DiagnosticoRealizado, S::OrcamentoEnviado,
            S::AguardandoAprovacao, S::OrcamentoRecusado, S::EmReparo, S::ProntoParaRetirada],
        'responsavel_id' => [S::Aberta, S::AguardandoDiagnostico, S::DiagnosticoRealizado, S::OrcamentoEnviado,
            S::AguardandoAprovacao, S::OrcamentoRecusado, S::EmReparo, S::ProntoParaRetirada],
        'diagnostico' => [S::DiagnosticoRealizado, S::OrcamentoEnviado, S::AguardandoAprovacao, S::OrcamentoRecusado,
            S::EmReparo, S::ProntoParaRetirada],
        // Retirada ou entrega pode ser decidida e trocada até o equipamento voltar para o cliente.
        'forma_devolucao' => [S::Aberta, S::AguardandoDiagnostico, S::DiagnosticoRealizado, S::OrcamentoEnviado,
            S::AguardandoAprovacao, S::OrcamentoRecusado, S::EmReparo, S::ProntoParaRetirada],
        'endereco_entrega' => [S::Aberta, S::AguardandoDiagnostico, S::DiagnosticoRealizado, S::OrcamentoEnviado,
            S::AguardandoAprovacao, S::OrcamentoRecusado, S::EmReparo, S::ProntoParaRetirada],
        'entrega_agendada' => [S::Aberta, S::AguardandoDiagnostico, S::DiagnosticoRealizado, S::OrcamentoEnviado,
            S::AguardandoAprovacao, S::OrcamentoRecusado, S::EmReparo, S::ProntoParaRetirada],
        'servico_executado' => [S::EmReparo, S::ProntoParaRetirada],
        'pecas_trocadas' => [S::EmReparo, S::ProntoParaRetirada],
    ];

    private const NOMES = [
        'equipamento_id' => 'o equipamento',
        'retirada_agendada' => 'a retirada combinada',
        'problema_relatado' => 'o problema relatado',
        'responsavel_id' => 'o técnico responsável',
        'forma_devolucao' => 'a forma de devolução (retirada ou entrega)',
        'endereco_entrega' => 'o endereço de entrega',
        'entrega_agendada' => 'a data da entrega',
        'diagnostico' => 'o diagnóstico',
        'servico_executado' => 'o serviço executado',
        'pecas_trocadas' => 'as peças trocadas',
    ];

    protected function prepareForValidation(): void
    {
        foreach (['problema_relatado', 'diagnostico', 'servico_executado', 'pecas_trocadas', 'motivo'] as $campo) {
            $valor = $this->input($campo);
            if (is_string($valor)) {
                $this->merge([$campo => trim($valor)]);
            }
        }

        foreach (['retirada_agendada', 'pecas_trocadas', 'motivo'] as $campo) {
            if ($this->has($campo) && $this->input($campo) === '') {
                $this->merge([$campo => null]);
            }
        }

        $this->prepararDevolucao();
    }

    public function rules(): array
    {
        return [
            'equipamento_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('equipamentos', 'id')->where(fn ($query) => $query->whereIn(
                    'cliente_id',
                    $this->user()->clientes()->select('id'),
                )),
            ],
            'responsavel_id' => ['sometimes', 'required', 'integer', ResponsavelRequest::regraUsuarioAtivo($this->user())],
            'problema_relatado' => ['sometimes', 'required', 'string', 'max:2000'],
            'retirada_agendada' => ['sometimes', 'nullable', 'date'],
            'diagnostico' => ['sometimes', 'required', 'string', 'max:5000'],
            'servico_executado' => ['sometimes', 'required', 'string', 'max:5000'],
            'pecas_trocadas' => ['sometimes', 'nullable', 'string', 'max:2000'],
            ...$this->regrasDevolucao(),
            'motivo' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Confere a etapa da OS para cada campo enviado.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $os = $this->route('ordemServico');
                $status = $os->status;

                if ($status === S::Entregue) {
                    $validator->errors()->add('status', 'A OS já foi entregue e não pode ser editada. Volte a etapa para corrigir algum dado.');

                    return;
                }

                foreach (self::ETAPAS_POR_CAMPO as $campo => $etapas) {
                    if ($this->mudou($os, $campo) && ! in_array($status, $etapas, true)) {
                        $validator->errors()->add($campo, 'Não é possível alterar '.self::NOMES[$campo]." com a OS em \"{$os->status_rotulo}\".");
                    }
                }

                $this->conferirDataFutura($validator, 'retirada_agendada', 'A retirada combinada não pode ser em uma data que já passou.', $os);
                $this->conferirEnderecoDeEntrega($validator, $os);
            },
        ];
    }

    /**
     * O campo veio com um valor diferente do gravado. Reenviar o mesmo valor (um formulário completo) não conta como alteração.
     */
    private function mudou(OrdemServico $os, string $campo): bool
    {
        if (! $this->has($campo)) {
            return false;
        }

        $novo = $this->input($campo);
        $atual = $os->getAttribute($campo);

        if ($atual instanceof CarbonInterface) {
            try {
                return $novo === null || ! $atual->equalTo(Carbon::parse($novo));
            } catch (\Throwable) {
                return true;
            }
        }

        if ($atual instanceof BackedEnum) {
            $atual = $atual->value;
        }

        return (string) $novo !== (string) $atual;
    }

    public function messages(): array
    {
        return [
            'equipamento_id.required' => 'Selecione o equipamento.',
            'equipamento_id.integer' => 'Equipamento não encontrado.',
            'equipamento_id.exists' => 'Equipamento não encontrado.',
            'responsavel_id.required' => 'Escolha o técnico responsável.',
            'responsavel_id.integer' => 'Técnico responsável não encontrado.',
            'responsavel_id.exists' => 'Escolha um usuário ativo da assistência como responsável.',
            'problema_relatado.required' => 'Descreva o problema relatado pelo cliente.',
            'problema_relatado.max' => 'O problema relatado pode ter no máximo 2000 caracteres.',
            'retirada_agendada.date' => 'Informe uma data e um horário válidos para a retirada.',
            'diagnostico.required' => 'Descreva o diagnóstico.',
            'diagnostico.max' => 'O diagnóstico pode ter no máximo 5000 caracteres.',
            'servico_executado.required' => 'Descreva o serviço executado.',
            'servico_executado.max' => 'O serviço executado pode ter no máximo 5000 caracteres.',
            'pecas_trocadas.max' => 'As peças trocadas podem ter no máximo 2000 caracteres.',
            ...$this->mensagensDevolucao(),
            'motivo.max' => 'O motivo pode ter no máximo 500 caracteres.',
        ];
    }
}
