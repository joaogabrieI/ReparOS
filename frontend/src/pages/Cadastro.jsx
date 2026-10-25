import { useState } from 'react'
import AcessoLayout, { Destaque } from '../components/AcessoLayout'
import CampoSenha from '../components/CampoSenha'
import { navegar } from '../components/roteador'

// Cadastro da assistência e do acesso do técnico (3b).
export default function Cadastro() {
  const [form, setForm] = useState({ nome_assistencia: '', nome: '', telefone: '', email: '', password: '', password_confirmation: '' })
  const [aceite, setAceite] = useState(false)

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target?.value ?? e })
  const confirmacaoErrada = form.password_confirmation && form.password !== form.password_confirmation
  const confirmacaoOk = form.password_confirmation && !confirmacaoErrada

  // Sem backend por enquanto: criar a conta só leva para o Início.
  function enviar(e) {
    e.preventDefault()
    navegar('/')
  }

  return (
    <AcessoLayout
      largura={440}
      titulo={
        <>
          <Destaque>Organize sua bancada em poucos minutos.</Destaque>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-400)', maxWidth: 420 }}>
            Cadastre a assistência, abra a primeira OS e envie o orçamento pelo WhatsApp do cliente.
          </div>
        </>
      }
    >
      <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Criar conta</div>
          <div className="pagina-subtitulo" style={{ marginTop: 4 }}>
            Dados da assistência e do seu acesso
          </div>
        </div>

        <div className="field">
          <label htmlFor="r-assist">Nome da assistência *</label>
          <input id="r-assist" className="input" autoFocus value={form.nome_assistencia} onChange={mudar('nome_assistencia')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="r-nome">Seu nome *</label>
            <input id="r-nome" className="input" value={form.nome} onChange={mudar('nome')} />
          </div>
          <div className="field">
            <label htmlFor="r-tel">WhatsApp da loja *</label>
            <input id="r-tel" className="input" placeholder="(11) 4002-8922" value={form.telefone} onChange={mudar('telefone')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-email">E-mail *</label>
          <input id="r-email" className="input" type="email" autoComplete="email" value={form.email} onChange={mudar('email')} />
        </div>
        <CampoSenha id="r-senha" rotulo="Senha *" valor={form.password} onChange={mudar('password')} mostrarForca />
        <CampoSenha
          id="r-confirma"
          rotulo="Confirmar senha *"
          valor={form.password_confirmation}
          onChange={mudar('password_confirmation')}
          erro={confirmacaoErrada ? 'As senhas não coincidem' : ''}
          icone={
            confirmacaoOk ? (
              <i className="ph ph-check-circle" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-success)' }} />
            ) : null
          }
        />

        <label className="check">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span className="caixa">
            <i className="ph ph-check" />
          </span>
          <span>Li e aceito os Termos de uso e a Política de privacidade</span>
        </label>

        <button type="submit" className="btn btn-primary btn-block" style={{ height: 44, marginTop: 4 }} >
          Criar conta
          <i className="ph ph-arrow-right" />
        </button>
        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)', textAlign: 'center' }}>
          Já tem conta? <a href="#/entrar">Entrar</a>
        </div>
      </form>
    </AcessoLayout>
  )
}
