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
}
