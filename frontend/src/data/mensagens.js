import { data, moeda, totalOrcamento } from './formato'

// Textos montados na tela antes de existirem na API: a prévia do orçamento em edição e o lembrete
// de aprovação. As mensagens de cada status vêm de GET /ordens-servico/{id}/whatsapp.

const primeiroNome = (ordem) => ordem.cliente?.nome.split(' ')[0] ?? ''

function nomeCurto(ordem) {
  const e = ordem.equipamento
  return e ? `${e.modelo}` : 'equipamento'
}

function listar(itens) {
  return itens.map((i) => `${i.descricao}${Number(i.quantidade) > 1 ? ` ${i.quantidade}x` : ''} (${moeda(i.quantidade * i.valor_unitario)})`).join('; ')
}

export function mensagemOrcamento(ordem, orcamento) {
  const itens = orcamento.itens.filter((i) => i.descricao.trim())
  const servicos = itens.filter((i) => i.tipo === 'servico')
  const pecas = itens.filter((i) => i.tipo === 'peca')
  const prazo = Number(orcamento.prazo_dias)
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

export function mensagemLembreteAprovacao(ordem, linkAcompanhamento) {
  const texto = `Olá, ${primeiroNome(ordem)}! Passando para lembrar do orçamento da OS ${ordem.numero} (${nomeCurto(ordem)}), enviado em ${data(ordem.orcamento?.data_envio)}. Podemos seguir com o reparo?`
  return linkAcompanhamento ? `${texto}\n\nPara aprovar ou recusar pelo celular, abra: ${linkAcompanhamento}` : texto
}
