<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Prova do consentimento (LGPD art. 8º e Marco Civil art. 7º): cada vez que um usuário aceita os
 * Termos de uso e a Política de privacidade, grava as versões aceitas, a data e hora, o IP e o navegador.
 * Só recebe inserções; um novo aceite (nova versão) é uma nova linha.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aceites_termos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->string('versao_termos', 20);
            $table->string('versao_privacidade', 20);
            $table->string('ip', 45)->nullable();
            $table->string('navegador', 500)->nullable();
            $table->timestamp('aceito_em');

            $table->index(['usuario_id', 'versao_termos', 'versao_privacidade']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aceites_termos');
    }
};
