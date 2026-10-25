// Cliente HTTP central para conversar com a API Laravel.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const resposta = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.message ?? `Erro ${resposta.status} ao chamar ${path}`)
  }
  return dados
}
