<?php

use App\Enums\StatusOrdemServico;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Cancelamento da OS (desistência do cliente): novo status "cancelada" nas colunas de status da OS e do
 * histórico, e o motivo e a data do cancelamento na OS. No PostgreSQL o enum do Laravel é um CHECK, que
 * é recriado com a lista nova.
 */
return new class extends Migration
{
    private const COLUNAS = [
        'ordens_servico' => ['status'],
        'historico_status' => ['status_anterior', 'status_novo'],
    ];

    public function up(): void
    {
        $this->trocarValores(StatusOrdemServico::valores());

        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->text('motivo_cancelamento')->nullable()->after('data_entrega');
            $table->timestamp('data_cancelamento')->nullable()->after('motivo_cancelamento');
        });
    }

    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->dropColumn(['motivo_cancelamento', 'data_cancelamento']);
        });

        $this->trocarValores(array_values(array_diff(StatusOrdemServico::valores(), ['cancelada'])));
    }

    /**
     * @param  list<string>  $valores
     */
    private function trocarValores(array $valores): void
    {
        $lista = implode(', ', array_map(fn (string $v) => "'{$v}'", $valores));

        foreach (self::COLUNAS as $tabela => $colunas) {
            foreach ($colunas as $coluna) {
                $nome = "{$tabela}_{$coluna}_check";
                DB::statement("ALTER TABLE {$tabela} DROP CONSTRAINT IF EXISTS {$nome}");
                DB::statement("ALTER TABLE {$tabela} ADD CONSTRAINT {$nome} CHECK ({$coluna}::text IN ({$lista}))");
            }
        }
    }
};
