<?php

namespace App\Enums;

enum TipoItemOrcamento: string
{
    case Peca = 'peca';
    case Servico = 'servico';

    /**
     * @return list<string>
     */
    public static function valores(): array
    {
        return array_column(self::cases(), 'value');
    }
}
