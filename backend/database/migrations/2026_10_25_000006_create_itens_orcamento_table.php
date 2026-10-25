<?php

use App\Enums\TipoItemOrcamento;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itens_orcamento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orcamento_id')->constrained('orcamentos')->cascadeOnDelete();
            $table->enum('tipo', TipoItemOrcamento::valores());
            $table->string('descricao');
            $table->unsignedInteger('quantidade')->default(1);
            $table->decimal('valor_unitario', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_orcamento');
    }
};
