<?php

namespace App\Support;

use App\Enums\StatusOrdemServico;
use App\Enums\TipoItemOrcamento;
use App\Models\ItemOrcamento;
use App\Models\OrdemServico;

/**
 * Mensagem pronta para cada status da OS e o link wa.me que a abre no WhatsApp (RF18).
 * O técnico revisa e envia pelo próprio WhatsApp; nada é enviado pelo servidor.
 */
class MensagemWhatsApp
{
    public function __construct(private OrdemServico $os) {}

    public function texto(): string
    {
        $os = $this->os;
        $ola = 'Olá, '.$this->primeiroNome().'!';
        $aparelho = "{$this->aparelho()} (OS {$os->numero})";

        $linhas = match ($os->status) {
            StatusOrdemServico::Aberta => $os->retirada_agendada
                ? ["{$ola} Confirmando a retirada do seu {$aparelho} em {$os->retirada_agendada->format('d/m \à\s H:i')}."]
                : ["{$ola} Recebemos o pedido de reparo do seu {$aparelho}. Vamos combinar a retirada?"],
            StatusOrdemServico::AguardandoDiagnostico => ["{$ola} Seu {$aparelho} já está com a gente e aguarda o diagnóstico. Avisaremos assim que tivermos o orçamento."],
            StatusOrdemServico::DiagnosticoRealizado => ["{$ola} O diagnóstico do seu {$aparelho} foi concluído. Em breve enviaremos o orçamento."],
            StatusOrdemServico::OrcamentoEnviado,
            StatusOrdemServico::AguardandoAprovacao => $this->orcamento($ola, $aparelho),
            StatusOrdemServico::OrcamentoRecusado => ["{$ola} Registramos que o orçamento do seu {$aparelho} não foi aprovado. O aparelho está disponível para devolução, sem reparo. Quando fica bom pra você?"],
            StatusOrdemServico::EmReparo => ["{$ola} O reparo do seu {$aparelho} está em andamento".($os->orcamento?->prazo_entrega ? ', com previsão para '.$os->orcamento->prazo_entrega->format('d/m/Y').'.' : '.')],
            StatusOrdemServico::ProntoParaRetirada => array_filter([
                "{$ola} Seu {$aparelho} está pronto para retirada.",
                $os->orcamento ? 'Total: '.$this->moeda($os->orcamento->valor_total) : null,
                'Quando fica bom pra você?',
            ]),
            StatusOrdemServico::Entregue => ["{$ola} Seu {$aparelho} foi entregue. Obrigado pela confiança!"],
        };

        $assinatura = $os->equipamento->cliente->tecnico->nome_assistencia;

        return implode("\n", [...$linhas, '', $assinatura]);
    }

    /**
     * Link wa.me com o DDI 55 na frente do DDD e número guardados no cadastro.
     */
    public function link(): string
    {
        return 'https://wa.me/'.$this->telefone().'?text='.rawurlencode($this->texto());
    }

    public function telefone(): string
    {
        return '55'.$this->os->equipamento->cliente->telefone_whatsapp;
    }

    /**
     * @return list<string>
     */
    private function orcamento(string $ola, string $aparelho): array
    {
        $orcamento = $this->os->orcamento;
        $itens = fn (TipoItemOrcamento $tipo) => $orcamento->itens
            ->where('tipo', $tipo)
            ->map(fn (ItemOrcamento $item) => $item->descricao.($item->quantidade > 1 ? " {$item->quantidade}x" : '')
                .' ('.$this->moeda($item->quantidade * $item->valor_unitario).')')
            ->implode('; ');
        $servicos = $itens(TipoItemOrcamento::Servico);
        $pecas = $itens(TipoItemOrcamento::Peca);
        $prazo = $orcamento->prazo_dias;

        return array_values(array_filter([
            "{$ola} Segue o orçamento do seu {$aparelho}.",
            '',
            "Diagnóstico: {$this->os->diagnostico}",
            $servicos !== '' ? "Serviços: {$servicos}." : null,
            $pecas !== '' ? "Peças: {$pecas}." : null,
            '',
            'Total: '.$this->moeda($orcamento->valor_total),
            "Prazo: {$prazo} ".($prazo === 1 ? 'dia útil' : 'dias úteis').' após aprovação.',
            $orcamento->validade_ate ? 'Orçamento válido até '.$orcamento->validade_ate->format('d/m/Y').'.' : null,
            'Podemos seguir?',
        ], fn ($linha) => $linha !== null));
    }

    private function primeiroNome(): string
    {
        return strtok($this->os->equipamento->cliente->nome, ' ');
    }

    private function aparelho(): string
    {
        return $this->os->equipamento->modelo;
    }

    private function moeda(float|string $valor): string
    {
        return 'R$ '.number_format((float) $valor, 2, ',', '.');
    }
}
