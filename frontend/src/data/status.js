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
]

// Fluxo principal de 8 etapas (a recusa é um desvio registrado à parte).
export const FLUXO = STATUS.filter((s) => s.valor !== 'orcamento_recusado').map((s) => s.valor)

export const PENDENTES = STATUS.filter((s) => s.valor !== 'entregue').map((s) => s.valor)

// OS parada = mais de 3 dias na mesma etapa (RF24).
export const DIAS_PARADA = 3

export function infoStatus(valor) {
  return STATUS.find((s) => s.valor === valor)
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
