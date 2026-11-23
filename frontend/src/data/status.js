// Status da OS, na mesma ordem e com os mesmos valores do enum StatusOrdemServico do backend.
export const STATUS = [
  { valor: 'aberta', rotulo: 'Aberta', matiz: 289, proximaAcao: 'Registrar retirada' },
  { valor: 'aguardando_diagnostico', rotulo: 'Aguardando diagnóstico', matiz: 55, proximaAcao: 'Registrar diagnóstico' },
  { valor: 'diagnostico_realizado', rotulo: 'Diagnóstico realizado', matiz: 200, proximaAcao: 'Lançar orçamento' },
  { valor: 'orcamento_enviado', rotulo: 'Orçamento enviado', matiz: 320, proximaAcao: 'Registrar resposta' },
  { valor: 'aguardando_aprovacao', rotulo: 'Aguardando aprovação', matiz: 90, proximaAcao: 'Registrar resposta' },
  { valor: 'orcamento_recusado', rotulo: 'Orçamento recusado', matiz: 25, proximaAcao: 'Registrar entrega' },
  { valor: 'em_reparo', rotulo: 'Em reparo', matiz: 240, proximaAcao: 'Marcar como pronto' },
  { valor: 'pronto_para_retirada', rotulo: 'Pronto para retirada', matiz: 155, proximaAcao: 'Registrar entrega' },
  { valor: 'entregue', rotulo: 'Entregue', matiz: null, proximaAcao: null },
  // Fora do fluxo: a OS pode ser cancelada em qualquer etapa antes da devolução (desistência do cliente).
  // Com o equipamento na assistência, ainda falta devolvê-lo sem reparo.
  { valor: 'cancelada', rotulo: 'Cancelada', matiz: 15, proximaAcao: 'Registrar devolução' },
]

// Fluxo principal de 8 etapas (a recusa e o cancelamento são desvios registrados à parte).
export const FLUXO = STATUS.filter((s) => !['orcamento_recusado', 'cancelada'].includes(s.valor)).map((s) => s.valor)

// Etapas em que a OS ainda pode ser cancelada (StatusOrdemServico::cancelavel no backend).
export const CANCELAVEIS = STATUS.filter((s) => !['entregue', 'cancelada', 'orcamento_recusado'].includes(s.valor)).map((s) => s.valor)

// Status que aparecem nas listas de pendentes. A cancelada só entra enquanto o equipamento não foi
// devolvido (ver estaPendente em regras.js).
export const PENDENTES = STATUS.filter((s) => s.valor !== 'entregue').map((s) => s.valor)

// OS parada = mais de 3 dias na mesma etapa (RF24).
export const DIAS_PARADA = 3

export function infoStatus(valor) {
  return STATUS.find((s) => s.valor === valor)
}

// Nome do status na tela. Com entrega no endereço do cliente, a OS pronta aparece como "Pronto para entrega"
// (o valor continua pronto_para_retirada, como no backend).
export function rotuloStatus(valor, formaDevolucao) {
  if (valor === 'pronto_para_retirada' && formaDevolucao === 'entrega') return 'Pronto para entrega'
  return infoStatus(valor)?.rotulo
}

// Como o equipamento volta para o cliente (FormaDevolucao no backend).
export const FORMAS_DEVOLUCAO = [
  { valor: 'retirada', rotulo: 'Cliente retira', descricao: 'Cliente retira na assistência', icone: 'ph-storefront' },
  { valor: 'entrega', rotulo: 'Entregar no endereço', descricao: 'Entrega no endereço do cliente', icone: 'ph-truck' },
]

export function infoDevolucao(valor) {
  return FORMAS_DEVOLUCAO.find((f) => f.valor === valor) ?? FORMAS_DEVOLUCAO[0]
}

export function corStatus(valor) {
  const matiz = infoStatus(valor)?.matiz
  if (matiz == null) return 'var(--color-neutral-500)'
  return `oklch(0.75 0.11 ${matiz})`
}

export const TIPOS_EQUIPAMENTO = [
  { valor: 'Smartphone', icone: 'ph-device-mobile' },
  { valor: 'Tablet', icone: 'ph-device-tablet' },
  { valor: 'Notebook', icone: 'ph-laptop' },
  { valor: 'Videogame', icone: 'ph-game-controller' },
  { valor: 'Controle de videogame', icone: 'ph-game-controller' },
]

export function iconeEquipamento(tipo) {
  return TIPOS_EQUIPAMENTO.find((t) => t.valor === tipo)?.icone ?? 'ph-wrench'
}
