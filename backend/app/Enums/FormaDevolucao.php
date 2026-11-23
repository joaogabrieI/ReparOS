<?php

namespace App\Enums;

/**
 * Como o equipamento volta para o cliente no fim do atendimento (consertado ou sem reparo):
 * o cliente retira na assistência ou a assistência entrega no endereço dele.
 */
enum FormaDevolucao: string
{
    case Retirada = 'retirada';
    case Entrega = 'entrega';

    public function rotulo(): string
    {
        return match ($this) {
            self::Retirada => 'Cliente retira na assistência',
            self::Entrega => 'Entrega no endereço do cliente',
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
