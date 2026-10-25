import { DIAS_PARADA, FLUXO } from './status'

export function diasDesde(iso) {
  const inicio = new Date(iso)
  inicio.setHours(0, 0, 0, 0)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((hoje - inicio) / 86400000)
}

export function estaParada(ordem) {
  return ordem.status !== 'aberta' && ordem.status !== 'entregue' && ordem.diasNaEtapa > DIAS_PARADA
}

export function proximoStatus(status) {
  return FLUXO[FLUXO.indexOf(status) + 1]
}

export const EQUIPAMENTO_VAZIO = { tipo: '', marca: '', modelo: '', numero_serie: '' }

// Dicas de senha exibidas no cadastro e na nova senha.
export function regrasSenha(senha) {
  return [
    { rotulo: '8+ caracteres', ok: senha.length >= 8 },
    { rotulo: 'Um número', ok: /\d/.test(senha) },
    { rotulo: 'Um símbolo', ok: /[^A-Za-z0-9]/.test(senha) },
  ]
}

// Peças trocadas no reparo: começam pelas peças previstas no orçamento.
export function pecasDoOrcamento(orcamento) {
  return (orcamento?.itens ?? []).filter((i) => i.tipo === 'peca').map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, prevista: true }))
}
