<?php

use App\Http\Controllers\AcompanhamentoController;
use App\Http\Controllers\AssistenciaController;
use App\Http\Controllers\AtividadeController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\EquipamentoController;
use App\Http\Controllers\OrcamentoController;
use App\Http\Controllers\OrdemServicoController;
use App\Http\Controllers\ReparoController;
use App\Http\Controllers\StatusController;
use App\Http\Controllers\TermosController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::get('/status', StatusController::class);
// Versões em vigor dos Termos de uso e da Política de privacidade (os textos ficam nas páginas públicas do frontend).
Route::get('/termos', [TermosController::class, 'versoes']);

// Área da assistência (usuários com login)
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/cadastro', [AuthController::class, 'cadastro'])->middleware('throttle:cadastro');
Route::post('/senha/esqueci', [AuthController::class, 'esqueciSenha'])->middleware('throttle:senha');
Route::post('/senha/redefinir', [AuthController::class, 'redefinirSenha'])->middleware('throttle:senha');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/eu', [AuthController::class, 'eu']);
    Route::post('/logout', [AuthController::class, 'logout']);
    // Aceite depois do login: primeiro acesso de quem o admin criou ou termos em nova versão.
    Route::post('/termos/aceite', [TermosController::class, 'aceitar']);
    Route::get('/termos/aceites', [TermosController::class, 'meus']);

    // Equipe e configurações: todos consultam; criar, editar, desativar e reativar é só do admin.
    Route::get('/usuarios', [UsuarioController::class, 'index']);
    Route::get('/assistencia', [AssistenciaController::class, 'show']);
    Route::middleware('can:admin')->group(function () {
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update']);
        Route::post('/usuarios/{usuario}/desativar', [UsuarioController::class, 'desativar']);
        Route::post('/usuarios/{usuario}/reativar', [UsuarioController::class, 'reativar']);
        Route::put('/assistencia', [AssistenciaController::class, 'update']);
        Route::get('/atividades', [AtividadeController::class, 'index']);
    });

    Route::apiResource('clientes', ClienteController::class)->except('destroy');
    Route::apiResource('equipamentos', EquipamentoController::class)->except('destroy');

    // Consulta da OS: qualquer usuário da assistência. Alterações: só o técnico responsável ou um admin.
    Route::get('/ordens-servico', [OrdemServicoController::class, 'index']);
    Route::post('/ordens-servico', [OrdemServicoController::class, 'store']);
    Route::get('/ordens-servico/{ordemServico}', [OrdemServicoController::class, 'show']);

    Route::prefix('ordens-servico/{ordemServico}')->group(function () {
        Route::get('/historico', [ReparoController::class, 'historico']);
        Route::get('/whatsapp', [OrdemServicoController::class, 'whatsapp']);

        // Etapas da OS: cada uma avança o status seguindo o fluxo e grava o histórico.
        Route::middleware('responsavel.os')->group(function () {
            Route::put('/', [OrdemServicoController::class, 'update']);
            Route::patch('/', [OrdemServicoController::class, 'update']);
            Route::put('/responsavel', [OrdemServicoController::class, 'responsavel']);
            // Desfaz a última etapa, com motivo: novo registro no histórico, sem apagar os anteriores.
            Route::post('/voltar-etapa', [OrdemServicoController::class, 'voltarEtapa']);
            Route::post('/retirada', [OrdemServicoController::class, 'retirada']);
            Route::post('/diagnostico', [OrdemServicoController::class, 'diagnostico']);
            Route::put('/orcamento', [OrcamentoController::class, 'salvar']);
            Route::post('/orcamento/envio', [OrcamentoController::class, 'enviar']);
            Route::post('/orcamento/resposta', [OrcamentoController::class, 'responder']);
            Route::put('/reparo', [ReparoController::class, 'reparo']);
            Route::post('/pronto', [ReparoController::class, 'pronto']);
            Route::post('/entrega', [ReparoController::class, 'entrega']);
        });
    });
});

// Área do cliente (sem login): acompanhar a OS pelo número. O limite por minuto dificulta
// adivinhar números de OS de outras pessoas.
Route::get('/acompanhar/{numero}', [AcompanhamentoController::class, 'show'])->middleware('throttle:20,1');
