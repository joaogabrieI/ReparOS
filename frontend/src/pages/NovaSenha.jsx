import { useState } from 'react'
import { AcessoCentral, CartaoAcesso } from '../components/AcessoLayout'
import CampoSenha from '../components/CampoSenha'
import ErroCampo from '../components/ErroCampo'
import { navegar } from '../components/roteador'
import { senhaValida } from '../data/regras'
import { redefinirSenha } from '../services/auth'

// Definir nova senha, aberta pelo link do e-mail (3d).
export default function NovaSenha({ token, email }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [sairOutros, setSairOutros] = useState(true)
  const [concluido, setConcluido] = useState(false)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const naoCoincide = confirmacao && senha !== confirmacao
  const podeSalvar = senhaValida(senha) && senha === confirmacao && !enviando

  async function salvar(e) {
    e.preventDefault()
    setEnviando(true)
    setErros({})
    setErroGeral('')
    try {
      await redefinirSenha({ token, email, password: senha, password_confirmation: confirmacao, sair_outros: sairOutros })
      setConcluido(true)
    } catch (falha) {
      if (falha.erros) setErros(falha.erros)
      else setErroGeral(falha.message)
      setEnviando(false)
    }
  }

  // Link aberto sem o token ou o e-mail: não há como trocar a senha.
  if (!token || !email) {
    return (
      <AcessoCentral>
        <CartaoAcesso>
          <span className="icone-quadro">
            <i className="ph ph-link-break" />
          </span>
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>Link incompleto</div>
          <div style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>Abra o link do e-mail de recuperação ou peça um novo.</div>
          <a href="#/esqueci-senha" className="btn btn-primary btn-block" style={{ height: 44 }}>
            Pedir novo link
          </a>
        </CartaoAcesso>
      </AcessoCentral>
    )
  }

  // Erro do token (expirado ou já usado) vem no campo e-mail.
  const erroLink = erros.email?.[0] ?? erros.token?.[0]

  return (
    <AcessoCentral>
      <CartaoAcesso largura={440}>
        {concluido ? (
          <>
            <span className="icone-quadro" style={{ background: 'oklch(0.82 0.1 155 / 0.12)', color: 'oklch(0.84 0.1 155)' }}>
              <i className="ph ph-check-circle" />
            </span>
            <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>Senha alterada</div>
            <div style={{ fontSize: 14, color: 'var(--color-neutral-400)' }}>Entre com a nova senha para continuar.</div>
            <button className="btn btn-primary btn-block" style={{ height: 44 }} onClick={() => navegar('/entrar')}>
              Ir para o login
              <i className="ph ph-arrow-right" />
            </button>
          </>
        ) : (
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span className="icone-quadro">
              <i className="ph ph-lock-key" />
            </span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>Criar nova senha</div>
              <div style={{ fontSize: 14, color: 'var(--color-neutral-400)', marginTop: 6 }}>
                Conta: {email}
              </div>
            </div>
            <CampoSenha id="ns-senha" rotulo="Nova senha" valor={senha} onChange={setSenha} mostrarForca autoFocus erro={erros.password?.[0]} autoComplete="new-password" />
            <CampoSenha
              id="ns-confirma"
              rotulo="Confirmar nova senha"
              valor={confirmacao}
              onChange={setConfirmacao}
              erro={naoCoincide ? 'As senhas não coincidem' : ''}
              autoComplete="new-password"
            />
            <label className="check">
              <input type="checkbox" checked={sairOutros} onChange={(e) => setSairOutros(e.target.checked)} />
              <span className="caixa">
                <i className="ph ph-check" />
              </span>
              Sair de todos os outros dispositivos
            </label>
            {erroLink && (
              <div className="erro-campo">
                <i className="ph ph-warning-circle" />
                <span>
                  {erroLink} <a href="#/esqueci-senha">Pedir novo link</a>
                </span>
              </div>
            )}
            {erroGeral && <ErroCampo erros={[erroGeral]} />}
            <button type="submit" className="btn btn-primary btn-block" style={{ height: 44 }} disabled={!podeSalvar}>
              {enviando ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </CartaoAcesso>
    </AcessoCentral>
  )
}
