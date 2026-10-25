import { api } from './api'

// Equipamentos dos clientes do técnico logado (rotas /api/equipamentos).
// A busca olha tipo, marca, modelo, número de série e nome do cliente.
export function listarEquipamentos({ busca = '', clienteId } = {}) {
  const params = new URLSearchParams()
  if (busca.trim()) params.set('busca', busca.trim())
  if (clienteId) params.set('cliente_id', clienteId)
  const query = params.toString()
  return api(`/equipamentos${query ? `?${query}` : ''}`)
}

// Ficha com o cliente e as OS do equipamento.
export function buscarEquipamento(id) {
  return api(`/equipamentos/${id}`)
}

// No cadastro, `dados.cliente_id` diz a quem o equipamento pertence; na edição ele é ignorado.
export function salvarEquipamento(dados, id) {
  return id ? api(`/equipamentos/${id}`, { method: 'PUT', body: dados }) : api('/equipamentos', { method: 'POST', body: dados })
}
