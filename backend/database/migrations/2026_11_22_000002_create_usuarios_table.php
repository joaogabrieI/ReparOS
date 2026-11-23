<?php

use App\Enums\PerfilUsuario;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Quem entra no sistema. Cada usuário pertence a uma assistência e nunca é apagado, só desativado,
 * para o registro de atividade não perder o autor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assistencia_id')->constrained('assistencias')->restrictOnDelete();
            $table->string('nome');
            $table->string('email')->unique();
            $table->string('password'); // senha no MER
            $table->enum('perfil', PerfilUsuario::valores())->default(PerfilUsuario::Tecnico->value);
            $table->boolean('ativo')->default(true);
            $table->timestamp('ultimo_acesso_em')->nullable();
            $table->rememberToken();
            $table->timestamps(); // created_at = data_cadastro no MER

            // Usado na regra "toda assistência mantém pelo menos um admin ativo".
            $table->index(['assistencia_id', 'perfil', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
