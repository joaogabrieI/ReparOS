import { api } from './api'

// Equipe da assistência (rotas /api/usuarios). Todos listam; criar, editar, desativar e reativar é só do admin.
export function listarUsuarios({ ativos = false } = {}) {
  return api(`/usuarios${ativos ? '?ativos=1' : ''}`)
}

// `dados`: nome, email, perfil (admin ou tecnico), password e password_confirmation (na edição, em branco mantém a senha).
export function salvarUsuario(dados, id) {
  return id ? api(`/usuarios/${id}`, { method: 'PUT', body: dados }) : api('/usuarios', { method: 'POST', body: dados })
}

// Se o usuário for responsável por OS em andamento, `transferirParaId` (outro usuário ativo) é obrigatório:
// as OS passam para ele na mesma hora. A resposta traz `os_transferidas` (quantas foram).
export const desativarUsuario = (id, transferirParaId = null) =>
  api(`/usuarios/${id}/desativar`, { method: 'POST', body: transferirParaId ? { transferir_para_id: transferirParaId } : {} })
export const reativarUsuario = (id) => api(`/usuarios/${id}/reativar`, { method: 'POST' })

// Configurações da assistência: nome, telefone e dias_limite_parada.
export const buscarAssistencia = () => api('/assistencia')
export const salvarAssistencia = (dados) => api('/assistencia', { method: 'PUT', body: dados })

// Registro de atividade (só admin). Filtros: usuario_id, acao, entidade, de, ate (aaaa-mm-dd) e page.
export function listarAtividades(filtros = {}) {
  const params = new URLSearchParams()
  for (const [campo, valor] of Object.entries(filtros)) {
    if (valor !== '' && valor !== null && valor !== undefined) params.set(campo, String(valor))
  }
  const query = params.toString()
  return api(`/atividades${query ? `?${query}` : ''}`)
}
