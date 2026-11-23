<?php

namespace App\Http\Requests\Concerns;

use App\Models\OrdemServico;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

/**
 * Retirada e entrega combinadas com o cliente não podem ficar numa data que já passou.
 * Conta o minuto atual (o campo da tela não tem segundos). Na edição, uma data já gravada
 * que ficou no passado e foi reenviada sem mudança não é recusada.
 */
trait ExigeDataFutura
{
    protected function conferirDataFutura(Validator $validator, string $campo, string $mensagem, ?OrdemServico $os = null): void
    {
        $valor = $this->input($campo);
        if (! $this->has($campo) || blank($valor) || $validator->errors()->has($campo)) {
            return;
        }

        try {
            $data = Carbon::parse($valor);
        } catch (\Throwable) {
            return; // a regra "date" já responde
        }

        $gravada = $os?->getAttribute($campo);
        if ($gravada && $gravada->equalTo($data)) {
            return;
        }

        if ($data->lt(now()->startOfMinute())) {
            $validator->errors()->add($campo, $mensagem);
        }
    }
}
