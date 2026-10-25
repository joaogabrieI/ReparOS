import { useState } from 'react'
import AcessoLayout, { Destaque } from '../components/AcessoLayout'
import CampoSenha from '../components/CampoSenha'
import { navegar } from '../components/roteador'

const VANTAGENS = ['Fluxo de status com histórico automático', 'Orçamento e avisos pelo WhatsApp', 'OS paradas em destaque']

// Login do técnico (3a).
export default function Entrar() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [manter, setManter] = useState(true)

  // Sem backend por enquanto: entrar só leva para o Início.
  function enviar(e) {
    e.preventDefault()
    navegar('/')
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
          <CampoSenha id="l-senha" rotulo="Senha" valor={senha} onChange={setSenha} />
        </div>

        <label className="check">
          <input type="checkbox" checked={manter} onChange={(e) => setManter(e.target.checked)} />
          <span className="caixa">
            <i className="ph ph-check" />
          </span>
          Manter conectado neste computador
        </label>

        <button type="submit" className="btn btn-primary btn-block" style={{ height: 44, marginTop: 4 }} >
          Entrar
          <i className="ph ph-arrow-right" />
        </button>

        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)', textAlign: 'center', marginTop: 8 }}>
          Ainda não tem conta? <a href="#/cadastro">Cadastre sua assistência</a>
        </div>
      </form>
    </AcessoLayout>
  )
}
