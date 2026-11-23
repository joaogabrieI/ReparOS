<?php

namespace App\Http\Requests\Concerns;

/**
 * Para pedidos sobre uma OS existente: ela precisa ser de um cliente da assistência do usuário logado.
 */
trait ExigeOsDaAssistencia
{
    public function authorize(): bool
    {
        $os = $this->route('ordemServico');

        return ! $os || $os->pertenceA($this->user());
    }

    /**
     * OS de outra assistência responde como se não existisse.
     */
    protected function failedAuthorization(): void
    {
        abort(404, 'OS não encontrada.');
    }
}
