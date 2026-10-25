import { useState } from 'react'
import { useDados } from '../data/contexto'
import { data, somenteDigitos } from '../data/formato'
import { navegar } from './roteador'

// Formulário de cliente (novo ou edição) com aviso de telefone já cadastrado (RF01, RF03, RF04).
export default function ClienteDialog({ cliente, onFechar, onSalvo, onUsarExistente }) {
  const { clientes, equipamentos, ordens } = useDados()
  const [form, setForm] = useState({
    nome: cliente?.nome ?? '',
    telefone_whatsapp: cliente?.telefone_whatsapp ?? '',
    endereco: cliente?.endereco ?? '',
  })

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const digitos = somenteDigitos(form.telefone_whatsapp)
  const duplicado =
    digitos.length >= 10 ? clientes.find((c) => c.id !== cliente?.id && somenteDigitos(c.telefone_whatsapp) === digitos) : null

  // Sem backend por enquanto: salvar só fecha o formulário.
  function salvar(e) {
    e.preventDefault()
    onSalvo?.()
  }

  let resumoDuplicado = ''
  if (duplicado) {
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
          <input id="c-nome" className="input" autoFocus value={form.nome} onChange={mudar('nome')} />
        </div>

        <div className="field">
          <label htmlFor="c-telefone">Telefone (WhatsApp) *</label>
          <input
            id="c-telefone"
            className="input"
            placeholder="(11) 90000-0000"
            style={duplicado ? { borderColor: 'oklch(0.84 0.11 90 / 0.7)' } : undefined}
            value={form.telefone_whatsapp}
            onChange={mudar('telefone_whatsapp')}
          />
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
          <input id="c-endereco" className="input" placeholder="Rua, número, complemento, bairro" value={form.endereco} onChange={mudar('endereco')} />
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Salvar cliente
          </button>
        </div>
      </form>
    </div>
  )
}
