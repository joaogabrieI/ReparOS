<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Código que vai no link do WhatsApp para o cliente aprovar ou recusar o orçamento pela tela de acompanhamento.
     * O número da OS só serve para consultar; responder exige este código, que não dá para adivinhar.
     */
    public function up(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->string('codigo_resposta', 64)->nullable()->after('canal_resposta');
        });

        // Orçamentos já enviados e ainda sem resposta ganham o código para o próximo link.
        DB::table('orcamentos')
            ->where('situacao', 'pendente')
            ->whereNotNull('data_envio')
            ->pluck('id')
            ->each(fn (int $id) => DB::table('orcamentos')->where('id', $id)->update(['codigo_resposta' => Str::random(32)]));
    }

    public function down(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropColumn('codigo_resposta');
        });
    }
};
