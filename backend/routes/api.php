<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Área do técnico
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/eu', [AuthController::class, 'eu']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Próximas rotas: clientes, equipamentos, ordens de serviço e orçamentos.
});

// Área do cliente (sem login): acompanhar a OS pelo número
// Route::get('/acompanhar/{numero}', ...);
