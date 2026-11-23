<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Rule;

/**
 * Aceite dos Termos de uso e da Política de privacidade: a caixa marcada e as versões que a pessoa leu,
 * que precisam ser as que estão em vigor.
 */
trait ValidaAceiteTermos
{
    protected function regrasAceiteTermos(): array
    {
        return [
            'aceite_termos' => ['accepted'],
            'versao_termos' => ['required', 'string', Rule::in([(string) config('termos.versao_termos')])],
            'versao_privacidade' => ['required', 'string', Rule::in([(string) config('termos.versao_privacidade')])],
        ];
    }

    protected function mensagensAceiteTermos(): array
    {
        $desatualizado = 'Os termos foram atualizados. Recarregue a página e leia a nova versão.';

        return [
            'aceite_termos.accepted' => 'Para continuar, aceite os Termos de uso e a Política de privacidade.',
            'aceite_termos.required' => 'Para continuar, aceite os Termos de uso e a Política de privacidade.',
            'versao_termos.required' => $desatualizado,
            'versao_termos.in' => $desatualizado,
            'versao_privacidade.required' => $desatualizado,
            'versao_privacidade.in' => $desatualizado,
        ];
    }
}
