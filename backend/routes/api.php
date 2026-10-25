<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\StatusController;
use Illuminate\Support\Facades\Route;

Route::get('/status', StatusController::class);

// Área do técnico
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/eu', [AuthController::class, 'eu']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('clientes', ClienteController::class)->except('destroy');

    // Próximas rotas: equipamentos, ordens de serviço e orçamentos.
});

// Área do cliente (sem login): acompanhar a OS pelo número
// Route::get('/acompanhar/{numero}', ...);
