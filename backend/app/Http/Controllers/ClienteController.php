<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClienteRequest;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Clientes do técnico logado: listagem com busca, cadastro, ficha e edição.
 * Cada técnico só enxerga os próprios clientes.
 */
class ClienteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $busca = trim((string) $request->query('busca', ''));
        $digitos = ClienteRequest::normalizarTelefone($busca);

        $clientes = $request->user()->clientes()
            ->withCount('equipamentos')
            ->withMax('ordensServico as ultima_os_em', 'ordens_servico.data_abertura')
            ->withCasts(['ultima_os_em' => 'datetime'])
            ->when($busca !== '', function ($query) use ($busca, $digitos) {
                $query->where(function ($query) use ($busca, $digitos) {
                    $query->where('nome', 'ilike', '%'.$busca.'%');
                    if ($digitos !== '') {
                        $query->orWhere('telefone_whatsapp', 'like', '%'.$digitos.'%');
                    }
                });
            })
            ->orderBy('nome')
            ->get();

        return response()->json($clientes);
    }

    public function store(ClienteRequest $request): JsonResponse
    {
        $cliente = $request->user()->clientes()->create($request->validated());

        return response()->json($cliente, 201);
    }

    /**
     * Ficha do cliente com os equipamentos e as OS de cada um.
     */
    public function show(Request $request, Cliente $cliente): JsonResponse
    {
        $this->garantirDono($request, $cliente);

        $cliente->load(['equipamentos' => fn ($query) => $query->orderBy('id')->with([
            'ordensServico' => fn ($query) => $query->latest('data_abertura'),
        ])]);

        return response()->json($cliente);
    }

    public function update(ClienteRequest $request, Cliente $cliente): JsonResponse
    {
        $cliente->update($request->validated());

        return response()->json($cliente);
    }

    /**
     * Cliente de outro técnico responde como se não existisse.
     */
    private function garantirDono(Request $request, Cliente $cliente): void
    {
        abort_unless($cliente->tecnico_id === $request->user()->id, 404, 'Cliente não encontrado.');
    }
}
