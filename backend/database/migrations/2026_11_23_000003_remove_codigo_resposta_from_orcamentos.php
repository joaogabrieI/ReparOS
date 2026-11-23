<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A tela do cliente passou a ser só para consulta: ele não aprova nem recusa o orçamento por ela.
     * O código que ia no link do WhatsApp para isso deixa de existir.
     */
    public function up(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropColumn('codigo_resposta');
        });
    }

    public function down(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->string('codigo_resposta', 64)->nullable()->after('canal_resposta');
        });
    }
};
