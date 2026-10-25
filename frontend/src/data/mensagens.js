import { data, diaMesHora, moeda, totalOrcamento } from './formato'
import { infoStatus } from './status'

// Textos enviados manualmente pelo técnico no WhatsApp (link wa.me).

const primeiroNome = (ordem) => ordem.cliente?.nome.split(' ')[0] ?? ''

function nomeCurto(ordem) {
  const e = ordem.equipamento
  return e ? `${e.modelo}` : 'equipamento'
}

function listar(itens) {
  return itens.map((i) => `${i.descricao}${Number(i.quantidade) > 1 ? ` ${i.quantidade}x` : ''} (${moeda(i.quantidade * i.valor_unitario)})`).join('; ')
}

export function mensagemStatus(ordem) {
  return `Olá, ${primeiroNome(ordem)}! A OS ${ordem.numero} (${nomeCurto(ordem)}) está com o status: ${infoStatus(ordem.status).rotulo}.`
}

export function mensagemOrcamento(ordem, orcamento) {
  const itens = orcamento.itens.filter((i) => i.descricao.trim())
  const servicos = itens.filter((i) => i.tipo === 'servico')
  const pecas = itens.filter((i) => i.tipo === 'peca')
  const prazo = Number(orcamento.prazo_entrega)
  return [
    `Olá, ${primeiroNome(ordem)}! Segue o orçamento do seu ${nomeCurto(ordem)} (OS ${ordem.numero}).`,
    '',
    `Diagnóstico: ${ordem.diagnostico}`,
    servicos.length ? `Serviços: ${listar(servicos)}.` : null,
    pecas.length ? `Peças: ${listar(pecas)}.` : null,
    '',
    `Total: ${moeda(totalOrcamento(orcamento))}`,
    `Prazo: ${prazo} ${prazo === 1 ? 'dia útil' : 'dias úteis'} após aprovação.`,
    'Podemos seguir?',
  ]
    .filter((l) => l !== null)
    .join('\n')
}

export function mensagemLembreteAprovacao(ordem) {
  return `Olá, ${primeiroNome(ordem)}! Passando para lembrar do orçamento da OS ${ordem.numero} (${nomeCurto(ordem)}), enviado em ${data(ordem.orcamento?.data_envio)}. Podemos seguir com o reparo?`
}

export function mensagemPronto(ordem) {
  return [
    `Oi, ${primeiroNome(ordem)}! Seu ${nomeCurto(ordem)} (OS ${ordem.numero}) está pronto para retirada.`,
    '',
    `Total: ${moeda(totalOrcamento(ordem.orcamento))}`,
    'Atendemos de seg. a sáb., das 9h às 19h. Quando fica bom pra você?',
  ].join('\n')
}

export function mensagemRetirada(ordem) {
  return `Olá, ${primeiroNome(ordem)}! Confirmando a retirada do ${nomeCurto(ordem)} em ${diaMesHora(ordem.retirada_agendada)}. OS ${ordem.numero}.`
}
