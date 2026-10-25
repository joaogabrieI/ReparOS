import { useState } from 'react'
import { AcessoCentral, CartaoAcesso } from '../components/AcessoLayout'
import CampoSenha from '../components/CampoSenha'
import { navegar } from '../components/roteador'

// Definir nova senha, aberta pelo link do e-mail (3d).
export default function NovaSenha({ email }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [sairOutros, setSairOutros] = useState(true)
  const [concluido, setConcluido] = useState(false)

  const naoCoincide = confirmacao && senha !== confirmacao

  // Sem backend por enquanto: salvar só mostra a confirmação.
  function salvar(e) {
    e.preventDefault()
    setConcluido(true)
  }

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
                Conta: {email || 'marcos@mtecreparos.com.br'}
              </div>
            </div>
            <CampoSenha id="ns-senha" rotulo="Nova senha" valor={senha} onChange={setSenha} mostrarForca autoFocus />
            <CampoSenha id="ns-confirma" rotulo="Confirmar nova senha" valor={confirmacao} onChange={setConfirmacao} erro={naoCoincide ? 'As senhas não coincidem' : ''} />
            <label className="check">
              <input type="checkbox" checked={sairOutros} onChange={(e) => setSairOutros(e.target.checked)} />
              <span className="caixa">
                <i className="ph ph-check" />
              </span>
              Sair de todos os outros dispositivos
            </label>
            <button type="submit" className="btn btn-primary btn-block" style={{ height: 44 }} >
              Salvar nova senha
            </button>
          </form>
        )}
      </CartaoAcesso>
    </AcessoCentral>
  )
}
