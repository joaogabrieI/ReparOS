import { useState } from 'react'
import { useDados } from '../data/contexto'
import { EQUIPAMENTO_VAZIO, equipamentoValido } from '../data/regras'
import EquipamentoCampos from './EquipamentoCampos'

// Cadastro e edição de equipamento vinculado a um cliente (RF05, RF06).
export default function EquipamentoDialog({ cliente, equipamento, onFechar }) {
  const { cadastrarEquipamento, atualizarEquipamento } = useDados()
  const [form, setForm] = useState(equipamento ?? EQUIPAMENTO_VAZIO)

  function salvar(e) {
    e.preventDefault()
    if (!equipamentoValido(form)) return
    if (equipamento) atualizarEquipamento(equipamento.id, form)
    else cadastrarEquipamento({ ...form, cliente_id: cliente.id })
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
          <button type="submit" className="btn btn-primary" disabled={!equipamentoValido(form)}>
            Salvar equipamento
          </button>
        </div>
      </form>
    </div>
  )
}
