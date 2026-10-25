import { useState } from 'react'
import Layout from '../components/Layout'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { useDados } from '../data/contexto'
import { dataIso, diaMes, diaMesHora, somenteDigitos } from '../data/formato'
import { iconeEquipamento, STATUS, TIPOS_EQUIPAMENTO } from '../data/status'

const GRID = '76px 100px minmax(0,1fr) minmax(0,1.2fr) 220px 150px'
const FILTROS_VAZIOS = { cliente: '', tipo: '', status: '', de: '', ate: '' }

const ORDENACOES = {
  recentes: { rotulo: 'Abertura (recentes)', comparar: (a, b) => b.data_abertura.localeCompare(a.data_abertura) },
  antigas: { rotulo: 'Abertura (antigas)', comparar: (a, b) => a.data_abertura.localeCompare(b.data_abertura) },
  mudanca: { rotulo: 'Última mudança', comparar: (a, b) => b.data_status.localeCompare(a.data_status) },
}

// Busca de todas as OS, inclusive entregues, por cliente, equipamento, status e período (RF23).
export default function BuscarOs() {
  const { ordens } = useDados()
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [ordenacao, setOrdenacao] = useState('recentes')

  const mudar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value })

  const termo = filtros.cliente.trim().toLowerCase()
  const digitos = somenteDigitos(filtros.cliente)
  const resultado = ordens
    .filter((o) => {
      if (termo) {
        const nome = o.cliente?.nome.toLowerCase().includes(termo)
        const telefone = digitos && somenteDigitos(o.cliente?.telefone_whatsapp ?? '').includes(digitos)
        if (!nome && !telefone) return false
      }
      if (filtros.tipo && o.equipamento?.tipo !== filtros.tipo) return false
      if (filtros.status && o.status !== filtros.status) return false
      const abertura = dataIso(o.data_abertura)
      if (filtros.de && abertura < filtros.de) return false
      if (filtros.ate && abertura > filtros.ate) return false
      return true
    })
    .sort(ORDENACOES[ordenacao].comparar)

  return (
    <Layout
      ativo="os"
      trilha="Buscar OS"
      acoes={
        <a className="btn btn-primary" href="#/os/nova">
          <i className="ph ph-plus" />
          Abrir OS
        </a>
      }
    >
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="pagina-titulo">Buscar OS</div>
          <div className="pagina-subtitulo">Todas as ordens, inclusive as entregues</div>
        </div>

        <div
          className="painel"
          style={{
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.3fr) auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div className="field">
            <label htmlFor="f-cliente">Cliente</label>
            <div className="input-icone">
              <i className="ph ph-user" />
              <input id="f-cliente" className="input" placeholder="Nome ou telefone" value={filtros.cliente} onChange={mudar('cliente')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="f-tipo">Equipamento</label>
            <select id="f-tipo" className="input" value={filtros.tipo} onChange={mudar('tipo')}>
              <option value="">Todos os tipos</option>
              {TIPOS_EQUIPAMENTO.map((t) => (
                <option key={t.valor}>{t.valor}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-status">Status</label>
            <select id="f-status" className="input" value={filtros.status} onChange={mudar('status')}>
              <option value="">Todos</option>
              {STATUS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Período de abertura</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" className="input" aria-label="Aberta a partir de" value={filtros.de} onChange={mudar('de')} />
              <span className="muted">–</span>
              <input type="date" className="input" aria-label="Aberta até" value={filtros.ate} onChange={mudar('ate')} />
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => setFiltros(FILTROS_VAZIOS)}>
            Limpar
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--color-neutral-400)' }}>
          <span>{resultado.length === 1 ? '1 resultado' : `${resultado.length} resultados`}</span>
          <label htmlFor="f-ordem" style={{ marginLeft: 'auto' }}>
            Ordenar por
          </label>
          <select
            id="f-ordem"
            className="input"
            style={{ width: 'auto', height: 28, background: 'transparent', border: 'none', color: 'var(--color-neutral-300)' }}
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
          >
            {Object.entries(ORDENACOES).map(([valor, o]) => (
              <option key={valor} value={valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="painel tabela">
          <div className="tabela-cabecalho" style={{ gridTemplateColumns: GRID }}>
            <span>OS</span>
            <span>Abertura</span>
            <span>Cliente</span>
            <span>Equipamento</span>
            <span>Status</span>
            <span>Última mudança</span>
          </div>
          {resultado.length === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>Nenhuma OS com esses filtros.</div>
          )}
          {resultado.map((o) => (
            <button key={o.id} className="tabela-linha" style={{ gridTemplateColumns: GRID }} onClick={() => navegar(`/os/${o.id}`)}>
              <span className="mono">{o.numero}</span>
              <span style={{ color: 'var(--color-neutral-400)' }}>{diaMes(o.data_abertura)}</span>
              <span style={{ fontWeight: 500 }}>{o.cliente?.nome}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <i className={`ph ${iconeEquipamento(o.equipamento?.tipo)}`} style={{ color: 'var(--color-neutral-500)' }} />
                <span className="truncar">{o.equipamento?.modelo}</span>
              </span>
              <span>
                <Pill status={o.status} />
              </span>
              <span style={{ color: 'var(--color-neutral-500)' }}>{diaMesHora(o.data_status)}</span>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  )
}
