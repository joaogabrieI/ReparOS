<?php

namespace Tests\Unit;

use App\Enums\StatusOrdemServico;
use PHPUnit\Framework\TestCase;

class StatusOrdemServicoTest extends TestCase
{
    public function test_existem_nove_status(): void
    {
        $this->assertCount(9, StatusOrdemServico::cases());
    }

    public function test_cada_status_tem_um_rotulo(): void
    {
        $this->assertSame('Orçamento recusado', StatusOrdemServico::OrcamentoRecusado->rotulo());
    }

    public function test_fluxo_segue_em_frente_sem_pular_etapas(): void
    {
        $this->assertTrue(StatusOrdemServico::Aberta->podeIrPara(StatusOrdemServico::AguardandoDiagnostico));
        $this->assertFalse(StatusOrdemServico::Aberta->podeIrPara(StatusOrdemServico::Entregue));
        $this->assertFalse(StatusOrdemServico::EmReparo->podeIrPara(StatusOrdemServico::Aberta));
        $this->assertSame([], StatusOrdemServico::Entregue->proximos());
    }

    public function test_recusa_do_orcamento_leva_a_devolucao(): void
    {
        $this->assertTrue(StatusOrdemServico::AguardandoAprovacao->podeIrPara(StatusOrdemServico::OrcamentoRecusado));
        $this->assertSame([StatusOrdemServico::Entregue], StatusOrdemServico::OrcamentoRecusado->proximos());
    }

    public function test_todo_status_chega_a_entrega(): void
    {
        foreach (StatusOrdemServico::cases() as $status) {
            $visitados = [];
            $fila = [$status];
            while ($fila) {
                $atual = array_shift($fila);
                $visitados[$atual->value] = true;
                foreach ($atual->proximos() as $proximo) {
                    if (! isset($visitados[$proximo->value])) {
                        $fila[] = $proximo;
                    }
                }
            }

            $this->assertArrayHasKey('entregue', $visitados, "{$status->value} não chega a Entregue");
        }
    }
}
