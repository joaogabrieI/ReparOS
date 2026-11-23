import { api } from './api'

// Ordens de serviço dos clientes da assistência (rotas /api/ordens-servico).
// Filtros: busca (nº da OS, cliente, telefone, marca ou modelo), status, tipo, de, ate (aaaa-mm-dd),
// pendentes, paradas, minhas (só as do usuário logado), responsavel_id e ordem (recentes, antigas ou mudanca).
export function listarOrdens(filtros = {}) {
  const params = new URLSearchParams()
  for (const [campo, valor] of Object.entries(filtros)) {
    if (valor === true) params.set(campo, '1')
    else if (typeof valor === 'string' && valor.trim()) params.set(campo, valor.trim())
  }
  const query = params.toString()
  return api(`/ordens-servico${query ? `?${query}` : ''}`)
}

// Resumo para o Início, a barra lateral e as OS pendentes: contagens (pendentes, por_status, paradas,
// prontas, abertas_hoje, entregues_mes e entregues_mes_anterior), agenda de hoje e amanhã (retiradas e
// entregas, com endereço), acoes (até 5 OS) e atividade (últimas 6 mudanças de status).
export function buscarPainel() {
  return api('/painel')
}

// Ficha da OS com equipamento, cliente, orçamento e histórico.
export function buscarOrdem(id) {
  return api(`/ordens-servico/${id}`)
}

// `dados`: equipamento_id, problema_relatado, retirada_agendada e responsavel_id (opcional: quem abre fica responsável).
// Opcional: forma_devolucao (retirada, o padrão, ou entrega), endereco_entrega e entrega_agendada.
export function abrirOrdem(dados) {
  return api('/ordens-servico', { method: 'POST', body: dados })
}

// Corrige dados da OS sem mudar o status. Mande só os campos alterados: equipamento_id, problema_relatado,
// retirada_agendada, responsavel_id, diagnostico, servico_executado, pecas_trocadas, forma_devolucao
// (retirada ou entrega), endereco_entrega e entrega_agendada; `motivo` é opcional.
// Cada campo só muda nas etapas permitidas pelo backend (422 por campo).
export function editarOrdem(id, dados) {
  return api(`/ordens-servico/${id}`, { method: 'PUT', body: dados })
}

// Cada etapa abaixo avança o status no backend e devolve a OS com o histórico atualizado.
const etapa = (id, caminho, method, body = {}) => api(`/ordens-servico/${id}/${caminho}`, { method, body })

// Troca o técnico responsável (usuário ativo da mesma assistência).
export const trocarResponsavel = (id, responsavelId) => etapa(id, 'responsavel', 'PUT', { responsavel_id: responsavelId })

export const registrarRetirada = (id, dados) => etapa(id, 'retirada', 'POST', dados)
export const registrarDiagnostico = (id, diagnostico) => etapa(id, 'diagnostico', 'POST', { diagnostico })

// Lança ou corrige o orçamento (itens e prazo_dias); devolve só o orçamento.
export const salvarOrcamento = (id, dados) => etapa(id, 'orcamento', 'PUT', dados)
export const enviarOrcamento = (id) => etapa(id, 'orcamento/envio', 'POST')
// `dados`: aprovado (true/false), canal (whatsapp, telefone ou presencial) e observacao.
export const responderOrcamento = (id, dados) => etapa(id, 'orcamento/resposta', 'POST', dados)

export const registrarReparo = (id, dados) => etapa(id, 'reparo', 'PUT', dados)
// `devolucao`: forma_devolucao, endereco_entrega e entrega_agendada escolhidos ao marcar como pronto.
export const marcarPronto = (id, observacao, devolucao = {}) => etapa(id, 'pronto', 'POST', { observacao, ...devolucao })
export const registrarEntrega = (id, dados) => etapa(id, 'entrega', 'POST', dados)

// Volta para a etapa anterior, com motivo (vai para o histórico). `statusAtual` é o que a tela mostra:
// se a OS já mudou (clique duplo, outra pessoa), a API recusa.
export const voltarEtapa = (id, motivo, statusAtual) => etapa(id, 'voltar-etapa', 'POST', { motivo, status_atual: statusAtual })

// Cancela a OS com motivo (desistência do cliente). Com o equipamento na assistência, a OS fica cancelada
// até a devolução (registrarEntrega). `statusAtual` evita cancelar uma OS que já mudou de etapa.
export const cancelarOrdem = (id, motivo, statusAtual) => etapa(id, 'cancelamento', 'POST', { motivo, status_atual: statusAtual })

// Mensagem pronta para o status atual e o link wa.me para o técnico enviar (RF18).
export function mensagemWhatsApp(id) {
  return api(`/ordens-servico/${id}/whatsapp`)
}

// Área do cliente, sem login: andamento da OS pelo número.
export function acompanharOrdem(numero) {
  return api(`/acompanhar/${encodeURIComponent(numero.trim())}`, { token: null })
}
