<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Prazo em dias úteis, validade do orçamento (CDC art. 40) e o canal em que o cliente respondeu (CDC art. 39, VI).
     */
    public function up(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            // O cliente combina "N dias úteis após a aprovação"; prazo_entrega vira data quando o orçamento é aprovado.
            $table->unsignedSmallInteger('prazo_dias')->nullable()->after('valor_total');
            $table->unsignedSmallInteger('validade_dias')->default(10)->after('situacao');
            $table->date('validade_ate')->nullable()->after('validade_dias');
            $table->string('canal_resposta', 20)->nullable()->after('data_resposta');
        });
    }

    public function down(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropColumn(['prazo_dias', 'validade_dias', 'validade_ate', 'canal_resposta']);
        });
    }
};
