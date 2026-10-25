<?php

namespace Tests\Feature;

use Tests\TestCase;

class RaizApiTest extends TestCase
{
    public function test_raiz_responde_com_o_nome_da_aplicacao(): void
    {
        $this->getJson('/')
            ->assertOk()
            ->assertJsonStructure(['app', 'api']);
    }
}
