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

    public static function semEtapaAnterior(StatusOrdemServico $atual): self
    {
        return new self("A OS está em \"{$atual->rotulo()}\" e não tem etapa anterior para voltar.");
    }

    /**
     * Outra pessoa mudou a etapa entre a tela carregar e o pedido chegar (ou o botão foi clicado duas vezes).
     */
    public static function etapaMudou(StatusOrdemServico $atual, string $acao = 'voltar a etapa'): self
    {
        return new self("A OS já está em \"{$atual->rotulo()}\". Recarregue a tela antes de {$acao}.");
    }

    public static function naoCancelavel(StatusOrdemServico $atual): self
    {
        return new self(match ($atual) {
            StatusOrdemServico::Cancelada => 'A OS já está cancelada.',
            StatusOrdemServico::Entregue => 'A OS já foi entregue e não pode ser cancelada.',
            default => "A OS está em \"{$atual->rotulo()}\": o equipamento já vai ser devolvido sem reparo, então não há o que cancelar.",
        });
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }
}
