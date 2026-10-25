import { useState } from 'react'
import { EQUIPAMENTO_VAZIO } from '../data/regras'
import EquipamentoCampos from './EquipamentoCampos'
import ErroCampo from './ErroCampo'

// Cadastro e edição de equipamento vinculado a um cliente (RF05, RF06).
// Com onSalvar, os dados vão para a API; sem ele, salvar só fecha o formulário.
export default function EquipamentoDialog({ cliente, equipamento, onSalvar, onFechar, onSalvo }) {
  const [form, setForm] = useState(() => {
    const inicial = { ...EQUIPAMENTO_VAZIO }
    for (const campo of Object.keys(inicial)) inicial[campo] = equipamento?.[campo] ?? ''
    return inicial
  })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    if (!onSalvar) return onFechar()

    setEnviando(true)
    setErros({})
    setErroGeral('')
    try {
      const salvo = await onSalvar({ ...form, cliente_id: cliente.id })
      onSalvo?.(salvo)
    } catch (erro) {
      if (erro.erros) {
        setErros(erro.erros)
        // O cliente não aparece como campo no formulário: o erro dele vai no rodapé.
        if (erro.erros.cliente_id) setErroGeral(erro.erros.cliente_id[0])
      } else setErroGeral(erro.message)
      setEnviando(false)
    }
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
        <EquipamentoCampos valor={form} onChange={setForm} erros={erros} colunas="1fr 1fr" />
        {erroGeral && <ErroCampo erros={[erroGeral]} />}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar equipamento'}
          </button>
        </div>
      </form>
    </div>
  )
}
