<?php

namespace App\Enums;

/**
 * Perfis de quem entra no sistema. O admin faz tudo o que o técnico faz e ainda gerencia
 * os usuários e as configurações da assistência.
 */
enum PerfilUsuario: string
{
    case Admin = 'admin';
    case Tecnico = 'tecnico';

    public function rotulo(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::Tecnico => 'Técnico',
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
