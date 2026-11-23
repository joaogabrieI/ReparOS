<?php

namespace Tests;

use App\Models\AceiteTermos;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * A API recusa as rotas do sistema sem o aceite dos termos (ExigeAceiteTermos). Nos testes das
     * outras funcionalidades, todo usuário criado já nasce com o aceite das versões atuais.
     * Os testes do próprio aceite (TermosApiTest) desligam isso.
     */
    protected bool $aceitarTermosAoCriarUsuario = true;

    protected function setUp(): void
    {
        parent::setUp();

        if ($this->aceitarTermosAoCriarUsuario) {
            Usuario::created(fn (Usuario $usuario) => $usuario->aceitesTermos()->create(AceiteTermos::versoesAtuais()));
        }
    }
}
