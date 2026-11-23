<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Os logins abertos passam a apontar para o usuário (mesmo id do técnico) e a tabela antiga sai.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\Models\Tecnico')
            ->update(['tokenable_type' => 'App\Models\Usuario']);

        Schema::drop('tecnicos');
    }

    public function down(): void
    {
        Schema::create('tecnicos', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('nome_assistencia');
            $table->string('telefone', 20)->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->unsignedSmallInteger('dias_limite_parada')->default(7);
            $table->rememberToken();
            $table->timestamps();
        });

        // Volta um técnico por assistência, com os dados do admin mais antigo dela.
        DB::statement("INSERT INTO tecnicos (id, nome, nome_assistencia, telefone, email, password, dias_limite_parada, remember_token, created_at, updated_at)
            SELECT DISTINCT ON (a.id) a.id, u.nome, a.nome, a.telefone, u.email, u.password, a.dias_limite_parada, u.remember_token, a.created_at, a.updated_at
            FROM assistencias a JOIN usuarios u ON u.assistencia_id = a.id AND u.perfil = 'admin'
            ORDER BY a.id, u.id");

        DB::table('personal_access_tokens')->where('tokenable_type', 'App\Models\Usuario')->delete();
    }
};
