<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\EquipamentoController;
use App\Http\Controllers\OrcamentoController;
use App\Http\Controllers\OrdemServicoController;
use App\Http\Controllers\StatusController;
use Illuminate\Support\Facades\Route;

Route::get('/status', StatusController::class);

// Área do técnico
Route::post('/login', [AuthController::class, 'login']);

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
    });
});

// Área do cliente (sem login): acompanhar a OS pelo número
// Route::get('/acompanhar/{numero}', ...);
