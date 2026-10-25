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
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_column(self::cases(), 'value');
    }
}
