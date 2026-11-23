import { useEffect, useState } from 'react'
import ErroCampo from '../components/ErroCampo'
import Layout from '../components/Layout'
import { useDados } from '../data/contexto'
import { dataHora } from '../data/formato'
import { listarAtividades } from '../services/usuarios'

const GRID = '150px 170px 160px minmax(0,1fr)'

// Ações gravadas pela API, com o nome mostrado na tela.
const ACOES = {
  entrou: 'Entrou',
  saiu: 'Saiu',
  criou: 'Criou',
  alterou: 'Alterou',
  mudou_status: 'Mudou status',
  voltou_etapa: 'Voltou etapa',
  cancelou: 'Cancelou OS',
  criou_usuario: 'Criou usuário',
  alterou_usuario: 'Alterou usuário',
  desativou_usuario: 'Desativou usuário',
  reativou_usuario: 'Reativou usuário',
  redefiniu_senha: 'Nova senha',
  aceitou_termos: 'Aceitou os termos',
}

const ENTIDADES = {
  cliente: 'Cliente',
  equipamento: 'Equipamento',
  ordem_servico: 'OS',
  orcamento: 'Orçamento',
  usuario: 'Usuário',
  assistencia: 'Assistência',
}

// Registro de atividade da assistência (só admin): quem fez o quê e quando, mais recente primeiro.
export default function Atividades({ entidade = '', entidadeId = '' }) {
  const { usuarios, admin, usuario } = useDados()
  const [filtros, setFiltros] = useState({ usuario_id: '', acao: '', entidade, entidade_id: entidadeId, de: '', ate: '' })
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState(null)
  const [erros, setErros] = useState({})
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null)

  const mudar = (campo) => (e) => {
    setFiltros({ ...filtros, [campo]: e.target.value })
    setPagina(1)
  }

  useEffect(() => {
    if (!admin) return
    let ativo = true
    listarAtividades({ ...filtros, page: pagina })
      .then((r) => {
        if (!ativo) return
        setResultado(r)
        setErros({})
        setErro('')
      })
      .catch((e) => {
        if (!ativo) return
        if (e.erros) setErros(e.erros)
        else setErro(e.message)
      })
    return () => {
      ativo = false
    }
  }, [filtros, pagina, admin])

  if (usuario && !admin) {
    return (
      <Layout ativo="atividades" trilha="Atividades">
        <div style={{ padding: '24px 28px' }} className="muted">
          Só o administrador da assistência consulta o registro de atividade.
        </div>
      </Layout>
    )
  }

  const lista = resultado?.data ?? []

  return (
    <Layout ativo="atividades" trilha="Atividades">
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 className="pagina-titulo" style={{ margin: 0 }}>
            Registro de atividade
          </h1>
          <div className="pagina-subtitulo">Quem fez cada ação na assistência. O registro não pode ser editado nem apagado.</div>
        </div>

        <div
          className="painel"
          style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr)) minmax(0,1.3fr) auto', gap: 12, alignItems: 'end' }}
        >
          <div className="field">
            <label htmlFor="at-usuario">Usuário</label>
            <select id="at-usuario" className="input" value={filtros.usuario_id} onChange={mudar('usuario_id')}>
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                  {u.ativo ? '' : ' (desativado)'}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="at-acao">Ação</label>
            <select id="at-acao" className="input" value={filtros.acao} onChange={mudar('acao')}>
              <option value="">Todas</option>
              {Object.entries(ACOES).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="at-entidade">Sobre</label>
            <select id="at-entidade" className="input" value={filtros.entidade} onChange={mudar('entidade')}>
              <option value="">Tudo</option>
              {Object.entries(ENTIDADES).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Período</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" className={`input${erros.de ? ' input-erro' : ''}`} aria-label="A partir de" value={filtros.de} onChange={mudar('de')} />
              <span className="muted">–</span>
              <input type="date" className={`input${erros.ate ? ' input-erro' : ''}`} aria-label="Até" value={filtros.ate} onChange={mudar('ate')} />
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setFiltros({ usuario_id: '', acao: '', entidade: '', entidade_id: '', de: '', ate: '' })
              setPagina(1)
            }}
          >
            Limpar
          </button>
        </div>

        {(erros.de || erros.ate || erro) && (
          <div role="alert">
            <ErroCampo erros={erros.de ?? erros.ate ?? [erro]} />
          </div>
        )}

        <div role="status" style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
          {!resultado ? 'Carregando…' : resultado.total === 1 ? '1 registro' : `${resultado.total} registros`}
          {filtros.entidade_id && ' · filtrado por um registro'}
        </div>

        <div className="painel tabela">
          <div className="tabela-cabecalho" style={{ gridTemplateColumns: GRID }}>
            <span>Quando</span>
            <span>Quem</span>
            <span>Ação</span>
            <span>Descrição</span>
          </div>
          {resultado && lista.length === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>Nenhuma atividade com esses filtros.</div>
          )}
          {lista.map((r) => {
            const temDados = r.dados_anteriores || r.dados_novos
            return (
              <div key={r.id} className="tabela-linha" style={{ gridTemplateColumns: GRID, alignItems: 'start' }}>
                <span style={{ color: 'var(--color-neutral-400)', fontVariantNumeric: 'tabular-nums' }}>{dataHora(r.created_at)}</span>
                <span className="truncar">{r.usuario?.nome ?? <span className="muted">Cliente / sistema</span>}</span>
                <span>{ACOES[r.acao] ?? r.acao}</span>
                <span style={{ minWidth: 0 }}>
                  {r.descricao}
                  {temDados && (
                    <button
                      className="btn btn-ghost"
                      style={{ height: 22, padding: '0 6px', marginLeft: 6, fontSize: 12 }}
                      onClick={() => setAberto(aberto === r.id ? null : r.id)}
                      aria-expanded={aberto === r.id}
                    >
                      {aberto === r.id ? 'ocultar' : 'detalhes'}
                    </button>
                  )}
                  {aberto === r.id && <Detalhes antes={r.dados_anteriores} depois={r.dados_novos} usuarios={usuarios} />}
                </span>
              </div>
            )
          })}
        </div>

        {resultado && resultado.last_page > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', fontSize: 13 }}>
            <button className="btn btn-secondary" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </button>
            <span className="muted">
              Página {resultado.current_page} de {resultado.last_page}
            </span>
            <button className="btn btn-secondary" disabled={pagina >= resultado.last_page} onClick={() => setPagina(pagina + 1)}>
              Próxima
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

// Campos que guardam o id de um usuário: aparecem com o nome.
const CAMPOS_USUARIO = ['responsavel_id', 'usuario_id', 'criado_por_id', 'transferidas_para_id']

// Antes e depois de cada campo alterado.
function Detalhes({ antes, depois, usuarios }) {
  const campos = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(depois ?? {})])]
  const texto = (v) =>
    v === null || v === undefined || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)
  const nome = (campo, v) => (CAMPOS_USUARIO.includes(campo) ? usuarios.find((u) => u.id === Number(v))?.nome : null)
  return (
    <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) minmax(0,1fr)', gap: '4px 12px', fontSize: 12.5 }}>
      <span className="muted">Campo</span>
      <span className="muted">Antes</span>
      <span className="muted">Depois</span>
      {campos.map((c) => (
        <span key={c} style={{ display: 'contents' }}>
          <span className="mono">{c}</span>
          <span className="truncar">{antes ? (nome(c, antes[c]) ?? texto(antes[c])) : '—'}</span>
          <span className="truncar">{nome(c, depois?.[c]) ?? texto(depois?.[c])}</span>
        </span>
      ))}
    </div>
  )
}
