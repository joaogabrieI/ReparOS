<?php

use App\Enums\StatusOrdemServico;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordens_servico', function (Blueprint $table) {
            $table->id();
            $table->string('numero', 30)->unique();
            // restrict: uma OS nunca some junto com o equipamento por engano
            $table->foreignId('equipamento_id')->constrained('equipamentos')->restrictOnDelete();
            $table->text('problema_relatado');
            $table->enum('status', StatusOrdemServico::valores())
                ->default(StatusOrdemServico::Aberta->value)
                ->index();
            $table->timestamp('data_status');
            $table->timestamp('data_abertura');
            $table->timestamp('retirada_agendada')->nullable();
            $table->timestamp('data_retirada')->nullable();
            $table->text('diagnostico')->nullable();
            $table->text('servico_executado')->nullable();
            $table->text('pecas_trocadas')->nullable();
            $table->timestamp('data_entrega')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordens_servico');
    }
};
