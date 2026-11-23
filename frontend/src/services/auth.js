import { api } from './api'

// Acesso à conta da assistência: cadastro e recuperação de senha (o login fica na tela Entrar).
export const cadastrar = (dados) => api('/cadastro', { method: 'POST', body: dados, token: null })
export const pedirLinkNovaSenha = (email) => api('/senha/esqueci', { method: 'POST', body: { email }, token: null })
export const redefinirSenha = (dados) => api('/senha/redefinir', { method: 'POST', body: dados, token: null })
// Aceite dos Termos de uso e da Política de privacidade depois do login (primeiro acesso ou nova versão).
export const aceitarTermos = (dados) => api('/termos/aceite', { method: 'POST', body: dados })
