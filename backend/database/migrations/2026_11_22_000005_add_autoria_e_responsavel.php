<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Quem criou cada registro, quem mudou cada status e o técnico responsável pela OS.
 * Os registros antigos ficam com o admin da assistência, que até aqui era o único técnico.
 */
return new class extends Migration
{
    private const AUTORIA = ['clientes', 'equipamentos', 'ordens_servico', 'orcamentos'];

    public function up(): void
    {
        foreach (self::AUTORIA as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->foreignId('criado_por_id')->nullable()->constrained('usuarios')->nullOnDelete();
            });
        }

        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->foreignId('responsavel_id')->nullable()->after('equipamento_id')->constrained('usuarios')->restrictOnDelete();
        });

        // Nulo quando quem mudou o status foi o próprio cliente, pelo link do WhatsApp.
        Schema::table('historico_status', function (Blueprint $table) {
            $table->foreignId('usuario_id')->nullable()->after('ordem_servico_id')->constrained('usuarios')->restrictOnDelete();
        });

        $this->preencherComOAdmin();

        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->foreignId('responsavel_id')->nullable(false)->change();
            $table->index(['responsavel_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('historico_status', fn (Blueprint $table) => $table->dropConstrainedForeignId('usuario_id'));

        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->dropIndex(['responsavel_id', 'status']);
            $table->dropConstrainedForeignId('responsavel_id');
        });

        foreach (self::AUTORIA as $tabela) {
            Schema::table($tabela, fn (Blueprint $table) => $table->dropConstrainedForeignId('criado_por_id'));
        }
    }

    private function preencherComOAdmin(): void
    {
        // Antes desta mudança, assistência e técnico tinham o mesmo id.
        DB::statement('UPDATE clientes SET criado_por_id = assistencia_id');
        DB::statement('UPDATE equipamentos e SET criado_por_id = c.assistencia_id FROM clientes c WHERE c.id = e.cliente_id');
        DB::statement('UPDATE ordens_servico o SET criado_por_id = c.assistencia_id, responsavel_id = c.assistencia_id
            FROM equipamentos e JOIN clientes c ON c.id = e.cliente_id WHERE e.id = o.equipamento_id');
        DB::statement('UPDATE orcamentos q SET criado_por_id = o.criado_por_id FROM ordens_servico o WHERE o.id = q.ordem_servico_id');
        // Respostas que o cliente deu pelo link continuam sem usuário.
        DB::statement("UPDATE historico_status h SET usuario_id = o.criado_por_id FROM ordens_servico o
            WHERE o.id = h.ordem_servico_id AND COALESCE(h.observacao, '') NOT LIKE '%tela de acompanhamento%'");
    }
};
