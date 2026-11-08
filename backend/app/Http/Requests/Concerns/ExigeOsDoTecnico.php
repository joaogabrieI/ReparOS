<?php

namespace App\Http\Requests\Concerns;

/**
 * Para pedidos sobre uma OS existente: ela precisa ser de um cliente do técnico logado.
 */
trait ExigeOsDoTecnico
{
    public function authorize(): bool
    {
        $os = $this->route('ordemServico');

        return ! $os || $os->pertenceA($this->user());
    }

    /**
     * OS de outro técnico responde como se não existisse.
     */
    protected function failedAuthorization(): void
    {
        abort(404, 'OS não encontrada.');
    }
}
