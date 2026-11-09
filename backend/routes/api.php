<?php

use App\Http\Controllers\AcompanhamentoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\EquipamentoController;
use App\Http\Controllers\OrcamentoController;
use App\Http\Controllers\OrdemServicoController;
use App\Http\Controllers\ReparoController;
use App\Http\Controllers\StatusController;
use Illuminate\Support\Facades\Route;

Route::get('/status', StatusController::class);

// Área do técnico
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/cadastro', [AuthController::class, 'cadastro'])->middleware('throttle:cadastro');
Route::post('/senha/esqueci', [AuthController::class, 'esqueciSenha'])->middleware('throttle:senha');
Route::post('/senha/redefinir', [AuthController::class, 'redefinirSenha'])->middleware('throttle:senha');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/eu', [AuthController::class, 'eu']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('clientes', ClienteController::class)->except('destroy');
    Route::apiResource('equipamentos', EquipamentoController::class)->except('destroy');

    Route::apiResource('ordens-servico', OrdemServicoController::class)
        ->except('destroy')
        ->parameters(['ordens-servico' => 'ordemServico']);

    // Etapas da OS: cada uma avança o status seguindo o fluxo e grava o histórico.
    Route::prefix('ordens-servico/{ordemServico}')->group(function () {
        Route::post('/retirada', [OrdemServicoController::class, 'retirada']);
        Route::post('/diagnostico', [OrdemServicoController::class, 'diagnostico']);
        Route::put('/orcamento', [OrcamentoController::class, 'salvar']);
        Route::post('/orcamento/envio', [OrcamentoController::class, 'enviar']);
        Route::post('/orcamento/resposta', [OrcamentoController::class, 'responder']);
        Route::put('/reparo', [ReparoController::class, 'reparo']);
        Route::post('/pronto', [ReparoController::class, 'pronto']);
        Route::post('/entrega', [ReparoController::class, 'entrega']);
        Route::get('/historico', [ReparoController::class, 'historico']);
        Route::get('/whatsapp', [OrdemServicoController::class, 'whatsapp']);
    });
});

// Área do cliente (sem login): acompanhar a OS pelo número. O limite por minuto dificulta
// adivinhar números de OS de outras pessoas.
Route::get('/acompanhar/{numero}', [AcompanhamentoController::class, 'show'])->middleware('throttle:20,1');
// O cliente aprova ou recusa o orçamento pela mesma tela; além do número, exige o código que só vai no link do WhatsApp.
Route::post('/acompanhar/{numero}/orcamento/resposta', [AcompanhamentoController::class, 'responder'])->middleware('throttle:resposta-orcamento');
