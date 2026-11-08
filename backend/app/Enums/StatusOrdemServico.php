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
