import { useState } from 'react'
import { AcessoCentral, CartaoAcesso } from '../components/AcessoLayout'

function Titulo({ titulo, children }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>{titulo}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-neutral-400)', marginTop: 6 }}>{children}</div>
    </div>
  )
}

// Recuperar senha: pedir o link e confirmar o envio (3c).
export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [enviadoPara, setEnviadoPara] = useState(null)

  // Sem backend por enquanto: o envio só mostra a tela de confirmação.
  function enviar(e) {
    e.preventDefault()
    setEnviadoPara(email.trim() || 'seu e-mail')
  }

  if (enviadoPara) {
    return (
      <AcessoCentral>
        <CartaoAcesso>
          <span className="icone-quadro" style={{ background: 'oklch(0.82 0.1 155 / 0.12)', color: 'oklch(0.84 0.1 155)' }}>
            <i className="ph ph-envelope-simple-open" />
          </span>
          <Titulo titulo="Verifique seu e-mail">
            Se houver uma conta com <span style={{ color: 'var(--color-text)' }}>{enviadoPara}</span>, você vai receber o link em instantes. Ele vale por 60 minutos.
          </Titulo>
          <div className="nota" style={{ color: 'var(--color-neutral-400)' }}>
            <i className="ph ph-info" style={{ marginTop: 2 }} />
            Não chegou? Confira a caixa de spam ou promoções.
          </div>
          <button className="btn btn-secondary btn-block" style={{ height: 40 }} onClick={() => setEnviadoPara(null)}>
            Reenviar link
          </button>
          <a href="#/entrar" style={{ fontSize: 13, textAlign: 'center' }}>
            Voltar para o login
          </a>
        </CartaoAcesso>
      </AcessoCentral>
    )
  }

  return (
    <AcessoCentral>
      <CartaoAcesso>
        <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <a href="#/entrar" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-neutral-400)' }}>
            <i className="ph ph-arrow-left" />
            Voltar para o login
          </a>
          <span className="icone-quadro">
            <i className="ph ph-key" />
          </span>
          <Titulo titulo="Esqueceu a senha?">Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</Titulo>
          <div className="field">
            <label htmlFor="rs-email">E-mail</label>
            <input id="rs-email" className="input" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ height: 44 }} >
            Enviar link de recuperação
          </button>
        </form>
      </CartaoAcesso>
    </AcessoCentral>
  )
}
