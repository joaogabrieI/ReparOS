<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * O cliente passa a ser da assistência, não de um técnico: todos os usuários dela o enxergam.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->foreignId('assistencia_id')->nullable()->after('id')->constrained('assistencias')->cascadeOnDelete();
        });

        DB::table('clientes')->update(['assistencia_id' => DB::raw('tecnico_id')]);

        Schema::table('clientes', function (Blueprint $table) {
            $table->dropUnique(['tecnico_id', 'telefone_whatsapp']);
            $table->dropConstrainedForeignId('tecnico_id');
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->foreignId('assistencia_id')->nullable(false)->change();
            // O mesmo WhatsApp não se repete dentro da mesma assistência.
            $table->unique(['assistencia_id', 'telefone_whatsapp']);
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->foreignId('tecnico_id')->nullable()->after('id')->constrained('tecnicos')->cascadeOnDelete();
        });

        DB::table('clientes')->update(['tecnico_id' => DB::raw('assistencia_id')]);

        Schema::table('clientes', function (Blueprint $table) {
            $table->dropUnique(['assistencia_id', 'telefone_whatsapp']);
            $table->dropConstrainedForeignId('assistencia_id');
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->foreignId('tecnico_id')->nullable(false)->change();
            $table->unique(['tecnico_id', 'telefone_whatsapp']);
        });
    }
};
