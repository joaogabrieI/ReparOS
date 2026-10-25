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
