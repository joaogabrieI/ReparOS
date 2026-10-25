<?php

namespace App\Http\Controllers;

use App\Models\Tecnico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Login do técnico por token (Laravel Sanctum).
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $tecnico = Tecnico::where('email', $dados['email'])->first();

        if (! $tecnico || ! Hash::check($dados['password'], $tecnico->password)) {
            throw ValidationException::withMessages([
                'email' => 'E-mail ou senha incorretos.',
            ]);
        }

        return response()->json([
            'token' => $tecnico->createToken('frontend')->plainTextToken,
            'tecnico' => $tecnico,
        ]);
    }

    public function eu(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sessão encerrada.']);
    }
}
