<?php

use App\Enums\SituacaoOrcamento;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orcamentos', function (Blueprint $table) {
            $table->id();
            // unique: cada OS tem no máximo um orçamento (1 : 0..1)
            $table->foreignId('ordem_servico_id')->unique()->constrained('ordens_servico')->cascadeOnDelete();
            $table->decimal('valor_total', 10, 2)->default(0);
            $table->date('prazo_entrega')->nullable();
            $table->enum('situacao', SituacaoOrcamento::valores())
                ->default(SituacaoOrcamento::Pendente->value);
            $table->timestamp('data_envio')->nullable();
            $table->timestamp('data_resposta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orcamentos');
    }
};
