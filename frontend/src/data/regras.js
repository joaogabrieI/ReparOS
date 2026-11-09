import { FLUXO } from './status'

// OS parada: a API já calcula (mais de 3 dias na mesma etapa sem ser entregue, RF24).
export function estaParada(ordem) {
  return Boolean(ordem.parada)
}

// Junta o cliente na OS para as telas não precisarem procurar.
export function detalhar(ordem) {
  return { ...ordem, cliente: ordem.equipamento?.cliente ?? ordem.cliente, diasNaEtapa: ordem.dias_na_etapa ?? 0 }
}

export function proximoStatus(status) {
  return FLUXO[FLUXO.indexOf(status) + 1]
}

export const EQUIPAMENTO_VAZIO = { tipo: '', marca: '', modelo: '', numero_serie: '' }

// Dicas de senha exibidas no cadastro e na nova senha (a mesma regra do backend).
export function regrasSenha(senha) {
  return [
    { rotulo: '8+ caracteres', ok: senha.length >= 8 },
    { rotulo: 'Uma letra', ok: /\p{L}/u.test(senha) },
    { rotulo: 'Um número', ok: /\p{N}/u.test(senha) },
    { rotulo: 'Um símbolo', ok: /[\p{P}\p{S}\p{Z}]/u.test(senha) },
  ]
}

export const senhaValida = (senha) => regrasSenha(senha).every((r) => r.ok)

// Peças trocadas no reparo: começam pelas peças previstas no orçamento.
export function pecasDoOrcamento(orcamento) {
  return (orcamento?.itens ?? []).filter((i) => i.tipo === 'peca').map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, prevista: true }))
}

// A API guarda as peças trocadas como texto, uma por linha ("SSD 480GB ×1").
export function textoPecas(pecas) {
  return pecas
    .filter((p) => p.descricao.trim())
    .map((p) => `${p.descricao.trim()} ×${Number(p.quantidade) || 1}`)
    .join('\n')
}

export function lerPecas(texto) {
  return (texto ?? '')
    .split('\n')
    .filter((linha) => linha.trim())
    .map((linha) => {
      const m = linha.match(/^(.*) ×(\d+)$/)
      return m ? { descricao: m[1], quantidade: Number(m[2]) } : { descricao: linha, quantidade: 1 }
    })
}
