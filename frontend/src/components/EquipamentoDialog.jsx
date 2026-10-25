import { useState } from 'react'
import { EQUIPAMENTO_VAZIO } from '../data/regras'
import EquipamentoCampos from './EquipamentoCampos'

// Cadastro e edição de equipamento vinculado a um cliente (RF05, RF06).
export default function EquipamentoDialog({ cliente, equipamento, onFechar }) {
  const [form, setForm] = useState(equipamento ?? EQUIPAMENTO_VAZIO)

  // Sem backend por enquanto: salvar só fecha o formulário.
  function salvar(e) {
    e.preventDefault()
    onFechar()
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <form className="dialog" style={{ width: 560 }} onSubmit={salvar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="dialog-title">{equipamento ? 'Editar equipamento' : 'Cadastrar equipamento'}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Vinculado a {cliente.nome}
            </div>
          </div>
          <button type="button" className="btn btn-ghost" style={{ padding: '0 8px' }} onClick={onFechar} aria-label="Fechar">
            <i className="ph ph-x" />
          </button>
        </div>
        <EquipamentoCampos valor={form} onChange={setForm} colunas="1fr 1fr" />
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Salvar equipamento
          </button>
        </div>
      </form>
    </div>
  )
}
