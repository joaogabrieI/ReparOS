import { useCallback, useEffect, useState } from 'react'
import CampoSenha from '../components/CampoSenha'
import ErroCampo from '../components/ErroCampo'
import Layout from '../components/Layout'
import { useDados } from '../data/contexto'
import { dataHora, inicial, telefone } from '../data/formato'
import { buscarAssistencia, desativarUsuario, listarUsuarios, reativarUsuario, salvarAssistencia, salvarUsuario } from '../services/usuarios'

const GRID = 'minmax(0,1.4fr) minmax(0,1.4fr) 130px 160px 190px'

const PERFIS = [
  { valor: 'tecnico', rotulo: 'Técnico', ajuda: 'Atende clientes, abre e movimenta OS.' },
  { valor: 'admin', rotulo: 'Administrador', ajuda: 'Tudo do técnico e ainda gerencia a equipe e a assistência.' },
]

// Usuário novo ou em edição. Na edição, a senha em branco mantém a atual.
function DialogoUsuario({ usuario, onFechar, onSalvo }) {
  const [form, setForm] = useState({ nome: usuario?.nome ?? '', email: usuario?.email ?? '', perfil: usuario?.perfil ?? 'tecnico' })
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function salvar(e) {
    e.preventDefault()
    setEnviando(true)
    setErros({})
    setErroGeral('')
    try {
      const salvo = await salvarUsuario({ ...form, password: senha, password_confirmation: confirmacao }, usuario?.id)
      onSalvo(salvo)
    } catch (falha) {
      if (falha.erros) setErros(falha.erros)
      else setErroGeral(falha.message)
      setEnviando(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <form className="dialog" onSubmit={salvar} aria-labelledby="u-titulo">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span id="u-titulo" className="dialog-title">
            {usuario ? 'Editar usuário' : 'Novo usuário'}
          </span>
          <button type="button" className="btn btn-ghost" style={{ padding: '0 8px' }} onClick={onFechar} aria-label="Fechar">
            <i className="ph ph-x" />
          </button>
        </div>

        <div className="field">
          <label htmlFor="u-nome">Nome *</label>
          <input id="u-nome" className={`input${erros.nome ? ' input-erro' : ''}`} autoFocus value={form.nome} onChange={mudar('nome')} />
          <ErroCampo erros={erros.nome} />
        </div>

        <div className="field">
          <label htmlFor="u-email">E-mail de acesso *</label>
          <input id="u-email" type="email" className={`input${erros.email ? ' input-erro' : ''}`} value={form.email} onChange={mudar('email')} />
          <ErroCampo erros={erros.email} />
        </div>

        <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, marginBottom: 6 }}>Perfil *</legend>
          {PERFIS.map((p) => (
            <label key={p.valor} className="check" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
              <input type="radio" name="perfil" value={p.valor} checked={form.perfil === p.valor} onChange={mudar('perfil')} />
              <span className="caixa" style={{ borderRadius: '50%' }}>
                <i className="ph ph-check" />
              </span>
              <span>
                {p.rotulo}
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-500)' }}>{p.ajuda}</span>
              </span>
            </label>
          ))}
          <ErroCampo erros={erros.perfil} />
        </fieldset>

        <CampoSenha
          id="u-senha"
          rotulo={usuario ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial *'}
          valor={senha}
          onChange={setSenha}
          mostrarForca
          erro={erros.password?.[0]}
          autoComplete="new-password"
        />
        {(senha || !usuario) && (
          <CampoSenha id="u-confirmacao" rotulo="Confirme a senha *" valor={confirmacao} onChange={setConfirmacao} autoComplete="new-password" />
        )}
        {usuario && senha && (
          <div className="nota">
            <i className="ph ph-info" style={{ marginTop: 2 }} />
            Ao trocar a senha, o usuário sai de todas as sessões abertas.
          </div>
        )}

        {erroGeral && (
          <div role="alert">
            <ErroCampo erros={[erroGeral]} />
          </div>
        )}

        <div className="dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Salvando…' : usuario ? 'Salvar' : 'Criar usuário'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Nome, WhatsApp da loja e dias para uma OS ser considerada parada.
function PainelAssistencia() {
  const { recarregar } = useDados()
  const [form, setForm] = useState(null)
  const [erros, setErros] = useState({})
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    buscarAssistencia()
      .then((a) => setForm({ nome: a.nome, telefone: telefone(a.telefone ?? ''), dias_limite_parada: a.dias_limite_parada }))
      .catch((e) => setAviso(e.message))
  }, [])

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function salvar(e) {
    e.preventDefault()
    setEnviando(true)
    setErros({})
    setAviso('')
    try {
      await salvarAssistencia({ ...form, dias_limite_parada: Number(form.dias_limite_parada) })
      setAviso('Dados da assistência salvos.')
      recarregar()
    } catch (falha) {
      if (falha.erros) setErros(falha.erros)
      else setAviso(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  if (!form) return null

  return (
    <form className="painel painel-pad" onSubmit={salvar} aria-labelledby="a-titulo">
      <div id="a-titulo" style={{ fontWeight: 500 }}>
        Assistência
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr) 170px auto', gap: 12, alignItems: 'end' }}>
        <div className="field">
          <label htmlFor="a-nome">Nome da assistência *</label>
          <input id="a-nome" className={`input${erros.nome ? ' input-erro' : ''}`} value={form.nome} onChange={mudar('nome')} />
        </div>
        <div className="field">
          <label htmlFor="a-telefone">WhatsApp da loja *</label>
          <input id="a-telefone" className={`input${erros.telefone ? ' input-erro' : ''}`} value={form.telefone} onChange={mudar('telefone')} />
        </div>
        <div className="field">
          <label htmlFor="a-dias">OS parada após (dias) *</label>
          <input
            id="a-dias"
            type="number"
            min="1"
            max="90"
            className={`input${erros.dias_limite_parada ? ' input-erro' : ''}`}
            value={form.dias_limite_parada}
            onChange={mudar('dias_limite_parada')}
          />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      <ErroCampo erros={erros.nome ?? erros.telefone ?? erros.dias_limite_parada} />
      {aviso && (
        <div role="status" style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>
          {aviso}
        </div>
      )}
    </form>
  )
}

// Equipe da assistência (só admin): criar, editar, mudar perfil, desativar e reativar usuários.
// Usuário nunca é apagado; sempre sobra pelo menos um admin ativo (a API confere).
export default function Equipe() {
  const { usuario: eu, admin, recarregar } = useDados()
  const [usuarios, setUsuarios] = useState(null)
  const [dialogo, setDialogo] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch((e) => setErro(e.message))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function alternarAtivo(u) {
    setErro('')
    try {
      await (u.ativo ? desativarUsuario(u.id) : reativarUsuario(u.id))
      carregar()
      recarregar()
    } catch (falha) {
      setErro(falha.message)
    }
  }

  if (eu && !admin) {
    return (
      <Layout ativo="equipe" trilha="Equipe">
        <div style={{ padding: '24px 28px' }} className="muted">
          Só o administrador da assistência gerencia a equipe.
        </div>
      </Layout>
    )
  }

  const ativos = (usuarios ?? []).filter((u) => u.ativo).length

  return (
    <Layout
      ativo="equipe"
      trilha="Equipe"
      acoes={
        <button className="btn btn-primary" onClick={() => setDialogo({ usuario: null })}>
          <i className="ph ph-user-plus" />
          Novo usuário
        </button>
      }
    >
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 className="pagina-titulo" style={{ margin: 0 }}>
            Equipe
          </h1>
          <div className="pagina-subtitulo">
            {usuarios ? `${ativos} ${ativos === 1 ? 'usuário ativo' : 'usuários ativos'}` : 'Carregando…'} · todos veem os mesmos clientes e OS
          </div>
        </div>

        <PainelAssistencia />

        {erro && (
          <div role="alert">
            <ErroCampo erros={[erro]} />
          </div>
        )}

        <div className="painel tabela">
          <div className="tabela-cabecalho" style={{ gridTemplateColumns: GRID }}>
            <span>Nome</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Último acesso</span>
            <span />
          </div>
          {(usuarios ?? []).map((u) => (
            <div key={u.id} className="tabela-linha" style={{ gridTemplateColumns: GRID, opacity: u.ativo ? 1 : 0.6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                  {inicial(u.nome)}
                </span>
                <span className="truncar" style={{ fontWeight: 500 }}>
                  {u.nome}
                  {u.id === eu?.id && <span className="muted"> (você)</span>}
                </span>
              </span>
              <span className="truncar" style={{ color: 'var(--color-neutral-400)' }}>
                {u.email}
              </span>
              <span>
                <span className={`tag ${u.perfil === 'admin' ? 'tag-accent' : 'tag-neutral'}`}>{u.perfil_rotulo}</span>
                {!u.ativo && <span className="tag tag-outline" style={{ marginLeft: 6 }}>Desativado</span>}
              </span>
              <span style={{ color: 'var(--color-neutral-500)' }}>{u.ultimo_acesso_em ? dataHora(u.ultimo_acesso_em) : 'Nunca entrou'}</span>
              <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <a className="btn btn-ghost" href={`#/atividades?entidade=usuario&entidade_id=${u.id}`} title="Atividades sobre este usuário" aria-label={`Atividades sobre ${u.nome}`}>
                  <i className="ph ph-list-magnifying-glass" />
                </a>
                <button className="btn btn-ghost" onClick={() => setDialogo({ usuario: u })} aria-label={`Editar ${u.nome}`}>
                  <i className="ph ph-pencil-simple" />
                </button>
                <button className="btn btn-secondary" onClick={() => alternarAtivo(u)}>
                  {u.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </span>
            </div>
          ))}
        </div>

        <div className="nota">
          <i className="ph ph-info" style={{ marginTop: 2 }} />
          Usuários não são apagados: ao desativar, a pessoa sai de todas as sessões e não entra mais, mas o histórico do que ela fez continua com o
          nome dela. A assistência precisa manter pelo menos um administrador ativo.
        </div>
      </div>

      {dialogo && (
        <DialogoUsuario
          usuario={dialogo.usuario}
          onFechar={() => setDialogo(null)}
          onSalvo={() => {
            setDialogo(null)
            carregar()
            recarregar()
          }}
        />
      )}
    </Layout>
  )
}
