<?php

use App\Enums\FormaDevolucao;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Forma de devolução do equipamento: o cliente retira na assistência (padrão, como era até aqui) ou a
 * assistência entrega no endereço dele, com o endereço e a data combinada da entrega.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->enum('forma_devolucao', FormaDevolucao::valores())
                ->default(FormaDevolucao::Retirada->value)
                ->after('data_retirada');
            $table->string('endereco_entrega')->nullable()->after('forma_devolucao');
            $table->timestamp('entrega_agendada')->nullable()->after('endereco_entrega');
        });
    }

    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->dropColumn(['forma_devolucao', 'endereco_entrega', 'entrega_agendada']);
        });
    }
};
