<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tecnico_id')->constrained('tecnicos')->cascadeOnDelete();
            $table->string('nome');
            $table->string('telefone_whatsapp', 20);
            $table->string('endereco')->nullable();
            $table->timestamps(); // created_at = data_cadastro no DER

            // O mesmo WhatsApp não se repete dentro da mesma assistência.
            $table->unique(['tecnico_id', 'telefone_whatsapp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
