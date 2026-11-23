<?php

namespace App\Enums;

/**
 * Os 9 status possíveis de uma Ordem de Serviço.
 */
enum StatusOrdemServico: string
{
    case Aberta = 'aberta';
    case AguardandoDiagnostico = 'aguardando_diagnostico';
    case DiagnosticoRealizado = 'diagnostico_realizado';
    case OrcamentoEnviado = 'orcamento_enviado';
    case AguardandoAprovacao = 'aguardando_aprovacao';
    case OrcamentoRecusado = 'orcamento_recusado';
    case EmReparo = 'em_reparo';
    case ProntoParaRetirada = 'pronto_para_retirada';
    case Entregue = 'entregue';

    public function rotulo(): string
    {
        return match ($this) {
            self::Aberta => 'Aberta',
            self::AguardandoDiagnostico => 'Aguardando diagnóstico',
            self::DiagnosticoRealizado => 'Diagnóstico realizado',
            self::OrcamentoEnviado => 'Orçamento enviado',
            self::AguardandoAprovacao => 'Aguardando aprovação',
            self::OrcamentoRecusado => 'Orçamento recusado',
            self::EmReparo => 'Em reparo',
            self::ProntoParaRetirada => 'Pronto para retirada',
            self::Entregue => 'Entregue',
        };
    }

    /**
     * Rótulo considerando como o equipamento volta ao cliente: com entrega no endereço, a OS pronta aparece
     * como "Pronto para entrega" (o valor gravado continua o mesmo).
     */
    public function rotuloPara(?FormaDevolucao $forma): string
    {
        return $this === self::ProntoParaRetirada && $forma === FormaDevolucao::Entrega
            ? 'Pronto para entrega'
            : $this->rotulo();
    }

    /**
     * Status para onde a OS pode ir a partir deste (RF16). A recusa do orçamento é um desvio
     * que leva à devolução sem reparo.
     *
     * @return list<self>
     */
    public function proximos(): array
    {
        return match ($this) {
            self::Aberta => [self::AguardandoDiagnostico],
            self::AguardandoDiagnostico => [self::DiagnosticoRealizado],
            self::DiagnosticoRealizado => [self::OrcamentoEnviado],
            self::OrcamentoEnviado => [self::AguardandoAprovacao, self::EmReparo, self::OrcamentoRecusado],
            self::AguardandoAprovacao => [self::EmReparo, self::OrcamentoRecusado],
            self::OrcamentoRecusado => [self::Entregue],
            self::EmReparo => [self::ProntoParaRetirada],
            self::ProntoParaRetirada => [self::Entregue],
            self::Entregue => [],
        };
    }

    /**
     * Etapa para onde a OS volta quando o usuário desfaz a última mudança. Nulo em "Aberta" (não há
     * etapa antes) e em "Entregue", que depende de como a OS chegou lá (pronta ou devolvida sem reparo).
     * O orçamento enviado volta direto para "Diagnóstico realizado": "Orçamento enviado" e "Aguardando
     * aprovação" acontecem juntos, e é em "Diagnóstico realizado" que o orçamento pode ser corrigido.
     */
    public function anterior(): ?self
    {
        return match ($this) {
            self::Aberta, self::Entregue => null,
            self::AguardandoDiagnostico => self::Aberta,
            self::DiagnosticoRealizado => self::AguardandoDiagnostico,
            self::OrcamentoEnviado, self::AguardandoAprovacao => self::DiagnosticoRealizado,
            self::EmReparo, self::OrcamentoRecusado => self::AguardandoAprovacao,
            self::ProntoParaRetirada => self::EmReparo,
        };
    }

    public function podeIrPara(self $novo): bool
    {
        return in_array($novo, $this->proximos(), true);
    }

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_column(self::cases(), 'value');
    }
}
