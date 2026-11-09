import { api } from './api'

// Acesso do técnico: cadastro e recuperação de senha (o login fica na tela Entrar).
export const cadastrar = (dados) => api('/cadastro', { method: 'POST', body: dados, token: null })
export const pedirLinkNovaSenha = (email) => api('/senha/esqueci', { method: 'POST', body: { email }, token: null })
export const redefinirSenha = (dados) => api('/senha/redefinir', { method: 'POST', body: dados, token: null })
