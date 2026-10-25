<?php

use App\Enums\StatusOrdemServico;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historico_status', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ordem_servico_id')->constrained('ordens_servico')->cascadeOnDelete();
            // nulo só no primeiro registro, quando a OS é aberta
            $table->enum('status_anterior', StatusOrdemServico::valores())->nullable();
            $table->enum('status_novo', StatusOrdemServico::valores());
            $table->timestamp('data_hora');
            $table->text('observacao')->nullable();

            $table->index(['ordem_servico_id', 'data_hora']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historico_status');
    }
};
