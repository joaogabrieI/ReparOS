import { useState } from 'react'
import Layout from '../components/Layout'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { useDados } from '../data/contexto'
import { estaParada } from '../data/regras'
import { corStatus, DIAS_PARADA, iconeEquipamento, PENDENTES, infoStatus } from '../data/status'
import { retirada, tempoNaEtapa } from '../data/formato'

const GRID = '76px minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.4fr) 150px 190px'
const PERIGO = 'oklch(0.82 0.12 25)'

// Tela inicial: OS não entregues agrupadas por status, com destaque para as paradas (RF21, RF24).
export default function OsPendentes() {
  const { ordens } = useDados()
  const [busca, setBusca] = useState('')
  const [soParadas, setSoParadas] = useState(false)

  const pendentes = ordens.filter((o) => o.status !== 'entregue')
  const paradas = pendentes.filter(estaParada)

  const termo = busca.trim().toLowerCase()
  const visiveis = pendentes.filter((o) => {
    if (soParadas && !estaParada(o)) return false
    if (!termo) return true
    return [o.numero, o.cliente?.nome, o.equipamento?.modelo, o.equipamento?.marca].some((t) => t?.toLowerCase().includes(termo))
  })

  const contagem = PENDENTES.map((status) => ({ status, n: pendentes.filter((o) => o.status === status).length }))
  // A recusa só aparece na faixa quando existir alguma OS nela.
  const faixa = contagem.filter((c) => c.status !== 'orcamento_recusado' || c.n > 0)
  const grupos = PENDENTES.map((status) => ({ status, linhas: visiveis.filter((o) => o.status === status) })).filter((g) => g.linhas.length)

  return (
    <Layout
      ativo="painel"
      trilha="OS pendentes"
      acoes={
        <>
          <div className="input-icone" style={{ width: 340 }}>
            <i className="ph ph-magnifying-glass" />
            <input
              className="input"
              style={{ height: 34, background: 'var(--color-surface)' }}
              placeholder="Nº da OS, cliente ou equipamento"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <a className="btn btn-primary" href="#/os/nova">
            <i className="ph ph-plus" />
            Abrir OS
          </a>
        </>
      }
    >
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="pagina-titulo">OS pendentes</div>
          <div className="pagina-subtitulo">
            {pendentes.length} {pendentes.length === 1 ? 'ordem não entregue' : 'ordens não entregues'}, agrupadas por status
          </div>
        </div>

        {paradas.length > 0 && (
          <div className="aviso aviso-perigo">
            <i className="ph ph-clock-countdown" style={{ color: PERIGO, fontSize: 19 }} />
            <span style={{ flex: 1 }}>
              <b style={{ fontWeight: 500 }}>{paradas.length === 1 ? '1 OS parada' : `${paradas.length} OS paradas`}</b>{' '}
              <span style={{ color: 'var(--color-neutral-400)' }}>na mesma etapa há mais de {DIAS_PARADA} dias, destacadas abaixo</span>
            </span>
            <button className="btn btn-link" onClick={() => setSoParadas(!soParadas)}>
              {soParadas ? 'Mostrar todas' : 'Mostrar só paradas'}
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${faixa.length},minmax(0,1fr))`, gap: 8 }}>
          {faixa.map(({ status, n }) => (
            <div
              key={status}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-md)', opacity: n ? 1 : 0.55 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', alignSelf: 'flex-start', marginTop: 4, background: corStatus(status) }} />
              <span style={{ fontSize: 12, color: 'var(--color-neutral-400)', lineHeight: 1.25, flex: 1 }}>{infoStatus(status).rotulo}</span>
              <span style={{ fontSize: 20, fontWeight: 500 }}>{n}</span>
            </div>
          ))}
        </div>

        <div className="card tabela">
          <div className="tabela-cabecalho" style={{ gridTemplateColumns: GRID, padding: '9px 18px' }}>
            <span>OS</span>
            <span>Cliente</span>
            <span>Equipamento</span>
            <span>Problema relatado</span>
            <span>Na etapa há</span>
            <span style={{ textAlign: 'right' }}>Próxima ação</span>
          </div>

          {grupos.length === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>Nenhuma OS encontrada.</div>
          )}

          {grupos.map((g) => (
            <div key={g.status}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '5px 18px',
                  background: 'var(--color-bg)',
                  borderBottom: '1px solid var(--color-neutral-900)',
                }}
              >
                <Pill status={g.status} />
                <span style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>{g.linhas.length} OS</span>
              </div>
              {g.linhas.map((o) => (
                <LinhaPendente key={o.id} ordem={o} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

function LinhaPendente({ ordem: o }) {
  const parada = estaParada(o)
  const aberta = o.status === 'aberta'
  return (
    <button
      className="tabela-linha"
      onClick={() => navegar(`/os/${o.id}`)}
      style={{
        gridTemplateColumns: GRID,
        padding: '7px 18px',
        background: parada ? 'oklch(0.8 0.12 25 / 0.06)' : undefined,
        boxShadow: parada ? 'inset 2px 0 0 oklch(0.75 0.13 25)' : 'none',
      }}
    >
      <span className="mono">{o.numero}</span>
      <span style={{ fontWeight: 500 }}>{o.cliente?.nome}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <i className={`ph ${iconeEquipamento(o.equipamento?.tipo)}`} style={{ color: 'var(--color-neutral-500)', fontSize: 17 }} />
        <span className="truncar">{o.equipamento?.modelo}</span>
      </span>
      <span className="truncar" style={{ color: 'var(--color-neutral-400)' }}>
        {o.problema_relatado}
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: parada ? PERIGO : 'var(--color-neutral-400)',
          fontWeight: parada ? 500 : 400,
        }}
      >
        <i className={`ph ${parada ? 'ph-warning' : aberta ? 'ph-truck' : 'ph-clock'}`} />
        {aberta ? retirada(o.retirada_agendada) : tempoNaEtapa(o.diasNaEtapa)}
      </span>
      <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--color-accent-300)' }}>{infoStatus(o.status).proximaAcao} →</span>
    </button>
  )
}
