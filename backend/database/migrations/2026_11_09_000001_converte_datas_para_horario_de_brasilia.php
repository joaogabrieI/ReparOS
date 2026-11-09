<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * As datas foram gravadas em UTC até o fuso da aplicação virar America/Sao_Paulo.
 * As colunas `timestamp` não guardam fuso, então as que já existem são convertidas
 * para o horário de Brasília (num banco novo, não há o que converter).
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->converter('UTC', 'America/Sao_Paulo');
    }

    public function down(): void
    {
        $this->converter('America/Sao_Paulo', 'UTC');
    }

    private function converter(string $de, string $para): void
    {
        $colunas = DB::select("
            select table_name, column_name
            from information_schema.columns
            where table_schema = current_schema()
              and data_type = 'timestamp without time zone'
              and table_name <> 'migrations'
        ");

        foreach ($colunas as $c) {
            DB::update(sprintf(
                'update %s set %s = (%2$s at time zone ?) at time zone ? where %2$s is not null',
                DB::getQueryGrammar()->wrapTable($c->table_name),
                DB::getQueryGrammar()->wrap($c->column_name),
            ), [$de, $para]);
        }
    }
};
