<?php

namespace Database\Seeders;

use App\Enums\PerfilUsuario;
use App\Enums\StatusOrdemServico;
use App\Enums\TipoItemOrcamento;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;

class DatabaseSeeder extends Seeder
{
    /**
     * Dados de exemplo para testar localmente: uma assistência com um admin e um técnico.
     */
    public function run(): void
    {
        $admin = Usuario::criarComAssistencia([
            'nome' => 'Técnico Demo',
            'nome_assistencia' => 'Assistência Demo',
            'telefone' => '11900000000',
            'email' => 'tecnico@reparos.test',
            'password' => 'Senha@123',
        ]);

        // O admin aceitou os termos no cadastro; a Ana, criada pelo admin, aceita no primeiro acesso.
        $admin->registrarAceiteTermos();

        $tecnico = $admin->assistencia->usuarios()->create([
            'nome' => 'Ana Técnica',
            'email' => 'ana@reparos.test',
            'password' => 'Senha@123',
            'perfil' => PerfilUsuario::Tecnico,
        ]);

        // O que vem a seguir fica no registro de atividade e no histórico em nome do admin.
        Auth::guard('sanctum')->setUser($admin);

        $cliente = $admin->clientes()->create([
            'nome' => 'Maria Cliente',
            'telefone_whatsapp' => '11911112222',
            'endereco' => 'Rua Exemplo, 123',
        ]);

        $equipamento = $cliente->equipamentos()->create([
            'tipo' => 'Notebook',
            'marca' => 'Dell',
            'modelo' => 'Inspiron 15',
        ]);

        $os = $equipamento->ordensServico()->create([
            'problema_relatado' => 'Não liga e esquenta muito.',
            'responsavel_id' => $tecnico->id,
        ]);

        $os->mudarStatus(StatusOrdemServico::AguardandoDiagnostico, 'Equipamento retirado na casa do cliente');
        $os->update(['diagnostico' => 'Fonte queimada e cooler sujo.']);
        $os->mudarStatus(StatusOrdemServico::DiagnosticoRealizado);

        $orcamento = $os->orcamento()->create(['prazo_dias' => 3]);
        $orcamento->itens()->createMany([
            ['tipo' => TipoItemOrcamento::Peca, 'descricao' => 'Fonte 65W', 'quantidade' => 1, 'valor_unitario' => 120],
            ['tipo' => TipoItemOrcamento::Servico, 'descricao' => 'Limpeza interna', 'quantidade' => 1, 'valor_unitario' => 80],
        ]);
        $orcamento->recalcularTotal();
    }
}
