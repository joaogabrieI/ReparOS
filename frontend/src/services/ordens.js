import { api } from './api'

// Ordens de serviço dos clientes do técnico logado (rotas /api/ordens-servico).
// Filtros: busca (nº da OS, cliente, telefone, marca ou modelo), status, tipo, de, ate (aaaa-mm-dd),
// pendentes, paradas e ordem (recentes, antigas ou mudanca).
export function listarOrdens(filtros = {}) {
  const params = new URLSearchParams()
  for (const [campo, valor] of Object.entries(filtros)) {
    if (valor === true) params.set(campo, '1')
    else if (typeof valor === 'string' && valor.trim()) params.set(campo, valor.trim())
  }
  const query = params.toString()
  return api(`/ordens-servico${query ? `?${query}` : ''}`)
}

// Ficha da OS com equipamento, cliente, orçamento e histórico.
export function buscarOrdem(id) {
  return api(`/ordens-servico/${id}`)
}

// `dados`: equipamento_id, problema_relatado e retirada_agendada.
export function abrirOrdem(dados) {
  return api('/ordens-servico', { method: 'POST', body: dados })
}

// Cada etapa abaixo avança o status no backend e devolve a OS com o histórico atualizado.
const etapa = (id, caminho, method, body = {}) => api(`/ordens-servico/${id}/${caminho}`, { method, body })

export const registrarRetirada = (id, dados) => etapa(id, 'retirada', 'POST', dados)
export const registrarDiagnostico = (id, diagnostico) => etapa(id, 'diagnostico', 'POST', { diagnostico })

// Lança ou corrige o orçamento (itens e prazo_dias); devolve só o orçamento.
export const salvarOrcamento = (id, dados) => etapa(id, 'orcamento', 'PUT', dados)
export const enviarOrcamento = (id) => etapa(id, 'orcamento/envio', 'POST')
// `dados`: aprovado (true/false), canal (whatsapp, telefone ou presencial) e observacao.
export const responderOrcamento = (id, dados) => etapa(id, 'orcamento/resposta', 'POST', dados)

export const registrarReparo = (id, dados) => etapa(id, 'reparo', 'PUT', dados)
export const marcarPronto = (id, observacao) => etapa(id, 'pronto', 'POST', { observacao })
export const registrarEntrega = (id, dados) => etapa(id, 'entrega', 'POST', dados)

// Mensagem pronta para o status atual e o link wa.me para o técnico enviar (RF18).
export function mensagemWhatsApp(id) {
  return api(`/ordens-servico/${id}/whatsapp`)
}

// Área do cliente, sem login: andamento da OS pelo número.
export function acompanharOrdem(numero) {
  return api(`/acompanhar/${encodeURIComponent(numero.trim())}`, { token: null })
}

// O cliente aprova ou recusa o orçamento pela tela, com o código que veio no link do WhatsApp.
export function responderOrcamentoCliente(numero, codigo, aprovado) {
  return api(`/acompanhar/${encodeURIComponent(numero.trim())}/orcamento/resposta`, {
    method: 'POST',
    body: { codigo, aprovado },
    token: null,
  })
}
