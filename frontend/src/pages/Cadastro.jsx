import { useState } from 'react'
import AcessoLayout, { Destaque } from '../components/AcessoLayout'
import CampoSenha from '../components/CampoSenha'
import ErroCampo from '../components/ErroCampo'
import { navegar } from '../components/roteador'
import { senhaValida } from '../data/regras'
import { guardarToken } from '../services/api'
import { cadastrar } from '../services/auth'

// Cadastro da assistência e do acesso do técnico (3b).
export default function Cadastro() {
  const [form, setForm] = useState({ nome_assistencia: '', nome: '', telefone: '', email: '', password: '', password_confirmation: '' })
  const [aceite, setAceite] = useState(false)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target?.value ?? e })
  const confirmacaoErrada = form.password_confirmation && form.password !== form.password_confirmation
  const confirmacaoOk = form.password_confirmation && !confirmacaoErrada

  const podeEnviar = aceite && senhaValida(form.password) && form.password === form.password_confirmation && !enviando

  // Cria a conta e já entra com ela.
  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setErros({})
    setErroGeral('')
    try {
      const { token } = await cadastrar(form)
      guardarToken(token, true)
      navegar('/')
    } catch (falha) {
      if (falha.erros) setErros(falha.erros)
      else setErroGeral(falha.message)
      setEnviando(false)
    }
  }

  const classe = (campo) => `input${erros[campo] ? ' input-erro' : ''}`

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
          <input id="r-assist" className={classe('nome_assistencia')} autoFocus value={form.nome_assistencia} onChange={mudar('nome_assistencia')} />
          <ErroCampo erros={erros.nome_assistencia} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="r-nome">Seu nome *</label>
            <input id="r-nome" className={classe('nome')} value={form.nome} onChange={mudar('nome')} />
          <ErroCampo erros={erros.nome} />
          </div>
          <div className="field">
            <label htmlFor="r-tel">WhatsApp da loja *</label>
            <input id="r-tel" className={classe('telefone')} placeholder="(11) 4002-8922" value={form.telefone} onChange={mudar('telefone')} />
          <ErroCampo erros={erros.telefone} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-email">E-mail *</label>
          <input id="r-email" className={classe('email')} type="email" autoComplete="email" value={form.email} onChange={mudar('email')} />
          <ErroCampo erros={erros.email} />
        </div>
        <CampoSenha id="r-senha" rotulo="Senha *" valor={form.password} onChange={mudar('password')} mostrarForca erro={erros.password?.[0]} autoComplete="new-password" />
        <CampoSenha
          id="r-confirma"
          rotulo="Confirmar senha *"
          valor={form.password_confirmation}
          onChange={mudar('password_confirmation')}
          autoComplete="new-password"
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

        {erroGeral && <ErroCampo erros={[erroGeral]} />}

        <button type="submit" className="btn btn-primary btn-block" style={{ height: 44, marginTop: 4 }} disabled={!podeEnviar}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
          <i className="ph ph-arrow-right" />
        </button>
        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)', textAlign: 'center' }}>
          Já tem conta? <a href="#/entrar">Entrar</a>
        </div>
      </form>
    </AcessoLayout>
  )
}
