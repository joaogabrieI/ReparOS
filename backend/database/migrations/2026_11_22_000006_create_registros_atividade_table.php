<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Quem fez o quê e quando. Só recebe inserções: nada aqui é editado ou apagado (ISO 27002 8.15).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_atividade', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assistencia_id')->constrained('assistencias')->cascadeOnDelete();
            // Nulo quando a ação veio do cliente (link do WhatsApp) ou do próprio sistema.
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->restrictOnDelete();
            $table->string('acao', 40);
            $table->string('entidade', 50);
            $table->unsignedBigInteger('entidade_id')->nullable();
            $table->text('descricao')->nullable();
            $table->jsonb('dados_anteriores')->nullable();
            $table->jsonb('dados_novos')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at'); // data_hora no MER

            $table->index(['assistencia_id', 'created_at']);
            $table->index(['entidade', 'entidade_id']);
            $table->index('usuario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_atividade');
    }
};
