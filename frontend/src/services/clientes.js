import { api } from './api'

// Clientes do técnico logado (rotas /api/clientes).
export function listarClientes(busca = '') {
  const query = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : ''
  return api(`/clientes${query}`)
}

// Ficha com os equipamentos e as OS de cada um.
export function buscarCliente(id) {
  return api(`/clientes/${id}`)
}

export function salvarCliente(dados, id) {
  return id ? api(`/clientes/${id}`, { method: 'PUT', body: dados }) : api('/clientes', { method: 'POST', body: dados })
}
