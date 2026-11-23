<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Cada técnico antigo vira uma assistência e o usuário admin dela, com o mesmo id,
 * para as referências antigas (clientes.tecnico_id) continuarem valendo.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('INSERT INTO assistencias (id, nome, telefone, dias_limite_parada, created_at, updated_at)
            SELECT id, nome_assistencia, telefone, dias_limite_parada, created_at, updated_at FROM tecnicos');

        DB::statement("INSERT INTO usuarios (id, assistencia_id, nome, email, password, perfil, ativo, remember_token, created_at, updated_at)
            SELECT id, id, nome, email, password, 'admin', true, remember_token, created_at, updated_at FROM tecnicos");

        $this->acertarSequencia('assistencias');
        $this->acertarSequencia('usuarios');
    }

    public function down(): void
    {
        DB::table('usuarios')->delete();
        DB::table('assistencias')->delete();
    }

    /**
     * Depois de inserir ids à mão, o próximo id gerado precisa vir depois do maior copiado.
     */
    private function acertarSequencia(string $tabela): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("SELECT setval(pg_get_serial_sequence('{$tabela}', 'id'), COALESCE((SELECT MAX(id) FROM {$tabela}), 1), (SELECT COUNT(*) > 0 FROM {$tabela}))");
    }
};
