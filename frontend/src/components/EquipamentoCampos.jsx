import { TIPOS_EQUIPAMENTO } from '../data/status'
import ErroCampo from './ErroCampo'

// Campos de tipo, marca, modelo e número de série (RF05), com os erros da API por campo.
export default function EquipamentoCampos({ valor, onChange, erros = {}, colunas = '1.1fr 1fr 1fr 1.1fr' }) {
  const mudar = (campo) => (e) => onChange({ ...valor, [campo]: e.target.value })
  const classe = (campo) => `input${erros[campo] ? ' input-erro' : ''}`
  return (
    <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10 }}>
      <div className="field">
        <label htmlFor="e-tipo">Tipo *</label>
        <select id="e-tipo" className={classe('tipo')} value={valor.tipo} onChange={mudar('tipo')}>
          <option value="">Selecione</option>
          {TIPOS_EQUIPAMENTO.map((t) => (
            <option key={t.valor}>{t.valor}</option>
          ))}
        </select>
        <ErroCampo erros={erros.tipo} />
      </div>
      <div className="field">
        <label htmlFor="e-marca">Marca *</label>
        <input id="e-marca" className={classe('marca')} value={valor.marca} onChange={mudar('marca')} />
        <ErroCampo erros={erros.marca} />
      </div>
      <div className="field">
        <label htmlFor="e-modelo">Modelo *</label>
        <input id="e-modelo" className={classe('modelo')} value={valor.modelo} onChange={mudar('modelo')} />
        <ErroCampo erros={erros.modelo} />
      </div>
      <div className="field">
        <label htmlFor="e-serie">Número de série</label>
        <input id="e-serie" className={classe('numero_serie')} value={valor.numero_serie} onChange={mudar('numero_serie')} />
        <ErroCampo erros={erros.numero_serie} />
      </div>
    </div>
  )
}
