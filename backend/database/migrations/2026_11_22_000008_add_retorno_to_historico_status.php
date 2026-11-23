<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Marca no histórico as vezes em que a OS voltou para a etapa anterior. O registro de antes continua lá:
 * voltar é um novo registro, nunca a remoção do anterior (ISO 27002 5.33).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('historico_status', function (Blueprint $table) {
            $table->boolean('retorno')->default(false)->after('status_novo');
        });
    }

    public function down(): void
    {
        Schema::table('historico_status', function (Blueprint $table) {
            $table->dropColumn('retorno');
        });
    }
};
