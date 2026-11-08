import { useEffect, useState } from 'react'
import ErroCampo from '../components/ErroCampo'
import Layout from '../components/Layout'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { diaMes, diaMesHora } from '../data/formato'
import { detalhar } from '../data/regras'
import { iconeEquipamento, STATUS, TIPOS_EQUIPAMENTO } from '../data/status'
import { listarOrdens } from '../services/ordens'

const GRID = '150px 100px minmax(0,1fr) minmax(0,1.2fr) 220px 150px'
const FILTROS_VAZIOS = { busca: '', tipo: '', status: '', de: '', ate: '', paradas: false }

const ORDENACOES = {
  recentes: 'Abertura (recentes)',
  antigas: 'Abertura (antigas)',
  mudanca: 'Última mudança',
}

// Busca de todas as OS, inclusive entregues, por número, cliente, equipamento, status e período (RF23, RF24).
// Os filtros e a ordenação são aplicados na API (/api/ordens-servico).
export default function BuscarOs() {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [ordenacao, setOrdenacao] = useState('recentes')
  const [resultado, setResultado] = useState(null)
  const [erros, setErros] = useState({})
  const [erro, setErro] = useState('')

  const mudar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  // Pequena espera enquanto o técnico digita, como na busca de clientes.
  useEffect(() => {
    let ativo = true
    const espera = setTimeout(() => {
      listarOrdens({ ...filtros, ordem: ordenacao })
        .then((lista) => {
          if (!ativo) return
          setResultado(lista.map(detalhar))
          setErros({})
          setErro('')
        })
        .catch((e) => {
          if (!ativo) return
          if (e.erros) setErros(e.erros)
          else setErro(e.message)
        })
    }, 250)
    return () => {
      ativo = false
      clearTimeout(espera)
    }
  }, [filtros, ordenacao])

  const lista = resultado ?? []
  const erroPeriodo = erros.de ?? erros.ate

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
            gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.3fr) auto auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div className="field">
            <label htmlFor="f-busca">Busca</label>
            <div className="input-icone">
              <i className="ph ph-magnifying-glass" />
              <input id="f-busca" className="input" placeholder="Nº da OS, cliente, telefone ou modelo" value={filtros.busca} onChange={mudar('busca')} />
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
              <input
                type="date"
                className={`input${erros.de ? ' input-erro' : ''}`}
                aria-label="Aberta a partir de"
                value={filtros.de}
                onChange={mudar('de')}
              />
              <span className="muted">–</span>
              <input
                type="date"
                className={`input${erros.ate ? ' input-erro' : ''}`}
                aria-label="Aberta até"
                value={filtros.ate}
                onChange={mudar('ate')}
              />
            </div>
          </div>
          <label className="check" style={{ alignItems: 'center', height: 36, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={filtros.paradas} onChange={mudar('paradas')} />
            <span className="caixa" style={{ marginTop: 0 }}>
              <i className="ph ph-check" />
            </span>
            Só paradas
          </label>
          <button className="btn btn-ghost" onClick={() => setFiltros(FILTROS_VAZIOS)}>
            Limpar
          </button>
        </div>

        {(erroPeriodo || erro) && (
          <div role="alert">
            <ErroCampo erros={erroPeriodo ?? [erro]} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--color-neutral-400)' }}>
          <span role="status">{!resultado ? 'Carregando…' : lista.length === 1 ? '1 resultado' : `${lista.length} resultados`}</span>
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
            {Object.entries(ORDENACOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
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
          {resultado && lista.length === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>Nenhuma OS com esses filtros.</div>
          )}
          {lista.map((o) => (
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
