import { useState } from 'react'
import { useDados } from '../data/contexto'
import { data, telefone, telefoneNormalizado } from '../data/formato'
import { navegar } from './roteador'

// Formulário de cliente (novo ou edição) com aviso de telefone já cadastrado (RF01, RF03, RF04).
// Com onSalvar, os dados vão para a API; sem ele (tela Abrir OS), salvar só fecha o formulário.
export default function ClienteDialog({ cliente, clientes: clientesApi, onSalvar, onFechar, onSalvo, onUsarExistente }) {
  const exemplo = useDados()
  const clientes = clientesApi ?? exemplo.clientes
  const { equipamentos, ordens } = exemplo
  const [form, setForm] = useState({
    nome: cliente?.nome ?? '',
    telefone_whatsapp: telefone(cliente?.telefone_whatsapp ?? ''),
    endereco: cliente?.endereco ?? '',
  })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const digitos = telefoneNormalizado(form.telefone_whatsapp)
  const duplicado =
    digitos.length >= 10 ? clientes.find((c) => c.id !== cliente?.id && telefoneNormalizado(c.telefone_whatsapp) === digitos) : null

  async function salvar(e) {
    e.preventDefault()
    if (!onSalvar) return onSalvo?.()

    setEnviando(true)
    setErros({})
    setErroGeral('')
    try {
      const salvo = await onSalvar(form)
      onSalvo?.(salvo)
    } catch (erro) {
      if (erro.erros) setErros(erro.erros)
      else setErroGeral(erro.message)
      setEnviando(false)
    }
  }

  let resumoDuplicado = ''
  if (duplicado?.equipamentos_count !== undefined) {
    // Cliente vindo da API: a listagem já traz a contagem e a data da última OS.
    resumoDuplicado = [
      duplicado.nome,
      duplicado.equipamentos_count === 1 ? '1 equipamento' : `${duplicado.equipamentos_count} equipamentos`,
      duplicado.ultima_os_em ? `última OS em ${data(duplicado.ultima_os_em)}` : 'nenhuma OS',
    ].join(' · ')
  } else if (duplicado) {
    const eqs = equipamentos.filter((e) => e.cliente_id === duplicado.id)
    const ultima = ordens
      .filter((o) => o.cliente?.id === duplicado.id)
      .map((o) => o.data_abertura)
      .sort()
      .at(-1)
    resumoDuplicado = [
      duplicado.nome,
      eqs.length === 1 ? '1 equipamento' : `${eqs.length} equipamentos`,
      ultima ? `última OS em ${data(ultima)}` : 'nenhuma OS',
    ].join(' · ')
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <form className="dialog" onSubmit={salvar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="dialog-title">{cliente ? 'Editar cliente' : 'Novo cliente'}</span>
          <button type="button" className="btn btn-ghost" style={{ padding: '0 8px' }} onClick={onFechar} aria-label="Fechar">
            <i className="ph ph-x" />
          </button>
        </div>

        <div className="field">
          <label htmlFor="c-nome">Nome *</label>
          <input id="c-nome" className={`input${erros.nome ? ' input-erro' : ''}`} autoFocus value={form.nome} onChange={mudar('nome')} />
          <ErroCampo erros={erros.nome} />
        </div>

        <div className="field">
          <label htmlFor="c-telefone">Telefone (WhatsApp) *</label>
          <input
            id="c-telefone"
            className={`input${erros.telefone_whatsapp ? ' input-erro' : ''}`}
            placeholder="(11) 90000-0000"
            style={duplicado ? { borderColor: 'oklch(0.84 0.11 90 / 0.7)' } : undefined}
            value={form.telefone_whatsapp}
            onChange={mudar('telefone_whatsapp')}
          />
          {!duplicado && <ErroCampo erros={erros.telefone_whatsapp} />}
        </div>

        {duplicado && (
          <div className="aviso-atencao" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.45 }}>
              <i className="ph ph-warning" style={{ color: 'var(--color-warning)', fontSize: 18, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 500 }}>Já existe um cliente com este telefone</div>
                <div style={{ color: 'var(--color-neutral-400)' }}>{resumoDuplicado}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingLeft: 28 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onFechar()
                  navegar(`/clientes/${duplicado.id}`)
                }}
              >
                Abrir ficha
              </button>
              {onUsarExistente && (
                <button type="button" className="btn btn-primary" onClick={() => onUsarExistente(duplicado)}>
                  Usar este cliente
                </button>
              )}
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="c-endereco">Endereço *</label>
          <input
            id="c-endereco"
            className={`input${erros.endereco ? ' input-erro' : ''}`}
            placeholder="Rua, número, complemento, bairro"
            value={form.endereco}
            onChange={mudar('endereco')}
          />
          <ErroCampo erros={erros.endereco} />
        </div>

        {erroGeral && <ErroCampo erros={[erroGeral]} />}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ErroCampo({ erros }) {
  if (!erros?.length) return null
  return (
    <div className="erro-campo">
      <i className="ph ph-warning-circle" />
      {erros[0]}
    </div>
  )
}
