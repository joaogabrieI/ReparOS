// Cliente HTTP central para conversar com a API Laravel.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const CHAVE_TOKEN = 'reparos.token'

// O token fica no localStorage ("manter conectado") ou só nesta aba (sessionStorage).
export function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? sessionStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function guardarToken(token, manter) {
  apagarToken()
  try {
    ;(manter ? localStorage : sessionStorage).setItem(CHAVE_TOKEN, token)
  } catch {
    // Sem armazenamento disponível: o login vale só até recarregar a página.
  }
}

export function apagarToken() {
  try {
    localStorage.removeItem(CHAVE_TOKEN)
    sessionStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // Nada a apagar.
  }
}

// Erro da API com o status HTTP e, na validação (422), as mensagens por campo.
export class ErroApi extends Error {
  constructor(mensagem, status, erros = null) {
    super(mensagem)
    this.status = status
    this.erros = erros
  }
}

export async function api(path, { method = 'GET', body, token = lerToken() } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let resposta
  try {
    resposta = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ErroApi('Não foi possível falar com o servidor. Verifique se o backend está rodando.', 0)
  }

  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    // Sessão expirada (30 min sem uso) ou sem login: volta para a tela de entrar.
    if (resposta.status === 401 && path !== '/login') {
      apagarToken()
      window.location.hash = token ? '/entrar?expirou=1' : '/entrar'
    }
    throw new ErroApi(dados?.message ?? `Erro ${resposta.status} ao chamar ${path}`, resposta.status, dados?.errors ?? null)
  }
  return dados
}
