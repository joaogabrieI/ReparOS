<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A assistência passa a ser a conta: é dona dos clientes e reúne vários usuários.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistencias', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('telefone', 20)->nullable();
            $table->unsignedSmallInteger('dias_limite_parada')->default(7);
            $table->timestamps(); // created_at = data_cadastro no MER
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistencias');
    }
};
