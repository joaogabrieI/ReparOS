<?php

namespace Database\Seeders;

use App\Enums\StatusOrdemServico;
use App\Enums\TipoItemOrcamento;
use App\Models\Tecnico;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Dados de exemplo para testar localmente.
     */
    public function run(): void
    {
        $tecnico = Tecnico::create([
            'nome' => 'Técnico Demo',
            'nome_assistencia' => 'Assistência Demo',
            'telefone' => '(11) 90000-0000',
            'email' => 'tecnico@reparos.test',
            'password' => 'senha123',
        ]);

        $cliente = $tecnico->clientes()->create([
            'nome' => 'Maria Cliente',
            'telefone_whatsapp' => '5511911112222',
            'endereco' => 'Rua Exemplo, 123',
        ]);

        $equipamento = $cliente->equipamentos()->create([
            'tipo' => 'Notebook',
            'marca' => 'Dell',
            'modelo' => 'Inspiron 15',
        ]);

        $os = $equipamento->ordensServico()->create([
            'problema_relatado' => 'Não liga e esquenta muito.',
        ]);

        $os->mudarStatus(StatusOrdemServico::AguardandoDiagnostico, 'Equipamento retirado na casa do cliente');
        $os->update(['diagnostico' => 'Fonte queimada e cooler sujo.']);
        $os->mudarStatus(StatusOrdemServico::DiagnosticoRealizado);

        $orcamento = $os->orcamento()->create(['prazo_entrega' => now()->addDays(3)]);
        $orcamento->itens()->createMany([
            ['tipo' => TipoItemOrcamento::Peca, 'descricao' => 'Fonte 65W', 'quantidade' => 1, 'valor_unitario' => 120],
            ['tipo' => TipoItemOrcamento::Servico, 'descricao' => 'Limpeza interna', 'quantidade' => 1, 'valor_unitario' => 80],
        ]);
        $orcamento->recalcularTotal();
    }
}
