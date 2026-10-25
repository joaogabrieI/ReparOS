import { TIPOS_EQUIPAMENTO } from '../data/status'

// Campos de tipo, marca, modelo e número de série (RF05).
export default function EquipamentoCampos({ valor, onChange, colunas = '1.1fr 1fr 1fr 1.1fr' }) {
  const mudar = (campo) => (e) => onChange({ ...valor, [campo]: e.target.value })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: colunas, gap: 10 }}>
      <div className="field">
        <label htmlFor="e-tipo">Tipo *</label>
        <select id="e-tipo" className="input" value={valor.tipo} onChange={mudar('tipo')}>
          <option value="">Selecione</option>
          {TIPOS_EQUIPAMENTO.map((t) => (
            <option key={t.valor}>{t.valor}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="e-marca">Marca *</label>
        <input id="e-marca" className="input" value={valor.marca} onChange={mudar('marca')} />
      </div>
      <div className="field">
        <label htmlFor="e-modelo">Modelo *</label>
        <input id="e-modelo" className="input" value={valor.modelo} onChange={mudar('modelo')} />
      </div>
      <div className="field">
        <label htmlFor="e-serie">Número de série</label>
        <input id="e-serie" className="input" value={valor.numero_serie} onChange={mudar('numero_serie')} />
      </div>
    </div>
  )
}
