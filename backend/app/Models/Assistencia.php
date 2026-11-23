<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

/**
 * A conta da assistência técnica: dona dos clientes, equipamentos e OS, com vários usuários.
 */
class Assistencia extends Model
{
    protected $table = 'assistencias';

    protected $fillable = [
        'nome',
        'telefone',
        'dias_limite_parada',
    ];

    protected function casts(): array
    {
        return [
            'dias_limite_parada' => 'integer',
        ];
    }

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class);
    }

    public function clientes(): HasMany
    {
        return $this->hasMany(Cliente::class);
    }

    public function equipamentos(): HasManyThrough
    {
        return $this->hasManyThrough(Equipamento::class, Cliente::class);
    }

    /**
     * Admins ativos, exceto o usuário informado: usado para nunca deixar a assistência sem admin.
     */
    public function outrosAdminsAtivos(Usuario $exceto): int
    {
        return $this->usuarios()
            ->where('perfil', 'admin')
            ->where('ativo', true)
            ->whereKeyNot($exceto->id)
            ->count();
    }
}
