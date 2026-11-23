import { useState } from 'react'
import { AcessoCentral } from '../components/AcessoLayout'
import ErroCampo from '../components/ErroCampo'
import { navegar } from '../components/roteador'
import { ACEITE_ATUAL } from '../data/termos'
import { apagarToken, api } from '../services/api'
import { aceitarTermos } from '../services/auth'
import { TextoDocumento } from './Documento'

// Aparece antes do sistema quando falta o aceite: primeiro acesso de quem o admin criou
// ou nova versão dos Termos de uso ou da Política de privacidade.
export default function AceitarTermos({ usuario, onAceito }) {
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const jaAceitouAntes = Boolean(usuario?.termos_atualizados)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      await aceitarTermos(ACEITE_ATUAL)
      onAceito()
    } catch (falha) {
      setErro(falha.erros ? Object.values(falha.erros)[0][0] : falha.message)
      setEnviando(false)
    }
  }

  async function sair() {
    await api('/logout', { method: 'POST' }).catch(() => {})
    apagarToken()
    navegar('/entrar')
  }

  return (
    <AcessoCentral>
      <form
        onSubmit={enviar}
        className="painel"
        style={{ width: 'min(760px, 100%)', marginTop: 56, boxShadow: 'var(--shadow-md)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>
            {usuario?.nome ? `Olá, ${usuario.nome.split(' ')[0]}` : 'Antes de continuar'}
          </h1>
          <div className="pagina-subtitulo" style={{ marginTop: 4 }}>
            {jaAceitouAntes
              ? 'Os Termos de uso ou a Política de privacidade foram atualizados. Leia e aceite a nova versão para continuar.'
              : 'Para usar o ReparOS, leia e aceite os Termos de uso e a Política de privacidade.'}
          </div>
        </div>

        <div
          tabIndex={0}
          aria-label="Texto dos Termos de uso e da Política de privacidade"
          style={{
            maxHeight: '46vh',
            overflow: 'auto',
            padding: '4px 16px 16px',
            border: '1px solid var(--color-neutral-800)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          <TextoDocumento tipo="termos" nivel={2} />
          <TextoDocumento tipo="privacidade" nivel={2} />
        </div>

        <label className="check">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span className="caixa">
            <i className="ph ph-check" />
          </span>
          <span>
            Li e aceito os{' '}
            <a href="#/termos" target="_blank" rel="noreferrer">
              Termos de uso
            </a>{' '}
            e a{' '}
            <a href="#/privacidade" target="_blank" rel="noreferrer">
              Política de privacidade
            </a>
          </span>
        </label>

        {erro && <ErroCampo erros={[erro]} />}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={sair}>
            Sair
          </button>
          <button type="submit" className="btn btn-primary" disabled={!aceite || enviando}>
            {enviando ? 'Salvando…' : 'Aceitar e continuar'}
            <i className="ph ph-arrow-right" />
          </button>
        </div>
      </form>
    </AcessoCentral>
  )
}
