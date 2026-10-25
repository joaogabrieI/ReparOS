// Formatação de datas, valores e textos exibidos nas telas.

const pad = (n) => String(n).padStart(2, '0')

export function data(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function diaMes(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

export function hora(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dataHora(iso) {
  return iso ? `${data(iso)} ${hora(iso)}` : '—'
}

export function diaMesHora(iso) {
  return iso ? `${diaMes(iso)} ${hora(iso)}` : '—'
}

// "hoje", "1 dia", "5 dias"
export function tempoNaEtapa(dias) {
  if (dias <= 0) return 'hoje'
  return dias === 1 ? '1 dia' : `${dias} dias`
}

export function retirada(iso) {
  const d = new Date(iso)
  const hoje = new Date()
  const mesmoDia = d.toDateString() === hoje.toDateString()
  return `retirada ${mesmoDia ? 'hoje' : diaMes(iso)} ${hora(iso)}`
}

export function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function totalOrcamento(orcamento) {
  return (orcamento?.itens ?? []).reduce((soma, i) => soma + Number(i.quantidade) * Number(i.valor_unitario), 0)
}

export function nomeEquipamento(e) {
  return e ? e.modelo : ''
}

export function inicial(nome) {
  return nome.trim().charAt(0).toUpperCase()
}

export function somenteDigitos(texto) {
  return texto.replace(/\D/g, '')
}

// Link wa.me com a mensagem pronta; o técnico envia manualmente (RF18).
export function linkWhatsApp(telefone, mensagem) {
  let numero = somenteDigitos(telefone)
  if (numero.length <= 11) numero = `55${numero}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}
