<?php

namespace App\Exceptions;

use App\Enums\StatusOrdemServico;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Pedido que pularia ou voltaria uma etapa do fluxo da OS (RF16).
 */
class TransicaoInvalidaException extends RuntimeException
{
    public static function entre(StatusOrdemServico $atual, StatusOrdemServico $novo): self
    {
        return new self("A OS está em \"{$atual->rotulo()}\" e não pode ir para \"{$novo->rotulo()}\".");
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }
}
