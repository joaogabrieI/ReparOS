import { data, diaMesHora, moeda, totalOrcamento } from './formato'
import { infoStatus } from './status'

// Textos enviados manualmente pelo técnico no WhatsApp (link wa.me).

const primeiroNome = (ordem) => ordem.cliente?.nome.split(' ')[0] ?? ''

export function mensagemStatus(ordem) {
  return `Olá, ${primeiroNome(ordem)}! A OS ${ordem.numero} (${ordem.equipamento?.modelo}) está com o status: ${infoStatus(ordem.status).rotulo}.`
}

export function mensagemOrcamento(ordem, orcamento) {
  const linhas = orcamento.itens
    .filter((i) => i.descricao.trim())
    .map((i) => `• ${i.descricao}${Number(i.quantidade) > 1 ? ` (${i.quantidade}x)` : ''}: ${moeda(i.quantidade * i.valor_unitario)}`)
  return [
    `Olá, ${primeiroNome(ordem)}! Segue o orçamento da OS ${ordem.numero} (${ordem.equipamento?.modelo}).`,
    '',
    `Diagnóstico: ${ordem.diagnostico}`,
    '',
    ...linhas,
    '',
    `Total: ${moeda(totalOrcamento(orcamento))}`,
    `Prazo: ${orcamento.prazo_entrega} ${Number(orcamento.prazo_entrega) === 1 ? 'dia útil' : 'dias úteis'} após a aprovação.`,
    '',
    'Pode responder aqui se aprova o serviço?',
  ].join('\n')
}

export function mensagemLembreteAprovacao(ordem) {
  return `Olá, ${primeiroNome(ordem)}! Passando para lembrar do orçamento da OS ${ordem.numero} (${ordem.equipamento?.modelo}), enviado em ${data(ordem.orcamento?.data_envio)}. Você aprova o serviço?`
}

export function mensagemPronto(ordem) {
  return `Olá, ${primeiroNome(ordem)}! Seu ${ordem.equipamento?.modelo} (OS ${ordem.numero}) está pronto. Podemos combinar a entrega? Total: ${moeda(totalOrcamento(ordem.orcamento))}.`
}

export function mensagemRetirada(ordem) {
  return `Olá, ${primeiroNome(ordem)}! Confirmando a retirada do ${ordem.equipamento?.modelo} em ${diaMesHora(ordem.retirada_agendada)}. OS ${ordem.numero}.`
}
