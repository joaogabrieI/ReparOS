import { useState } from 'react'
import AcessoLayout, { Destaque } from '../components/AcessoLayout'
import CampoSenha from '../components/CampoSenha'
import { navegar } from '../components/roteador'
import { api, guardarToken } from '../services/api'

const VANTAGENS = ['Fluxo de status com histórico automático', 'Orçamento e avisos pelo WhatsApp', 'OS paradas em destaque']

// Login do técnico (3a).
export default function Entrar() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [manter, setManter] = useState(true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      const { token } = await api('/login', { method: 'POST', body: { email, password: senha }, token: null })
      guardarToken(token, manter)
      navegar('/')
    } catch (falha) {
      setErro(falha.erros?.email?.[0] ?? falha.erros?.password?.[0] ?? falha.message)
      setEnviando(false)
    }
  }

  return (
    <AcessoLayout
      titulo={
        <>
          <Destaque>Cada aparelho, do recebimento à entrega.</Destaque>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--color-neutral-300)' }}>
            {VANTAGENS.map((v) => (
              <span key={v} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <i className="ph ph-check" style={{ color: 'var(--color-accent-300)' }} />
                {v}
              </span>
            ))}
          </div>
        </>
      }
    >
      <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Entrar</div>
          <div className="pagina-subtitulo" style={{ marginTop: 4 }}>
            Acesse a conta da sua assistência
          </div>
        </div>

        <div className="field">
          <label htmlFor="l-email">E-mail</label>
          <input id="l-email" className="input" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div style={{ position: 'relative' }}>
          <a href="#/esqueci-senha" style={{ position: 'absolute', right: 0, top: 0, fontSize: 12.5, zIndex: 1 }}>
            Esqueci minha senha
          </a>
          <CampoSenha id="l-senha" rotulo="Senha" valor={senha} onChange={setSenha} erro={erro} />
        </div>

        <label className="check">
          <input type="checkbox" checked={manter} onChange={(e) => setManter(e.target.checked)} />
          <span className="caixa">
            <i className="ph ph-check" />
          </span>
          Manter conectado neste computador
        </label>

        <button type="submit" className="btn btn-primary btn-block" style={{ height: 44, marginTop: 4 }} disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
          <i className="ph ph-arrow-right" />
        </button>

        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)', textAlign: 'center', marginTop: 8 }}>
          Ainda não tem conta? <a href="#/cadastro">Cadastre sua assistência</a>
        </div>
      </form>
    </AcessoLayout>
  )
}
