import { useState } from 'react'
import { regrasSenha } from '../data/regras'

// Campo de senha com botão de mostrar/ocultar e, opcionalmente, a força da senha.
export default function CampoSenha({ id, rotulo, valor, onChange, mostrarForca, erro, icone, autoFocus }) {
  const [visivel, setVisivel] = useState(false)
  const regras = regrasSenha(valor)
  const barras = [0, 1, 3, 4][regras.filter((r) => r.ok).length]

  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          className={`input${erro ? ' input-erro' : ''}`}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 40 }}
          autoFocus={autoFocus}
        />
        {icone ?? (
          <button
            type="button"
            className="btn btn-icon"
            style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, color: 'var(--color-neutral-500)' }}
            onClick={() => setVisivel(!visivel)}
            aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <i className={`ph ${visivel ? 'ph-eye-slash' : 'ph-eye'}`} />
          </button>
        )}
      </div>
      {mostrarForca && valor && (
        <>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                style={{ flex: 1, height: 3, borderRadius: 2, background: i < barras ? 'oklch(0.78 0.11 155)' : 'var(--color-neutral-800)' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--color-neutral-400)' }}>
            {regras.map((r) => (
              <span key={r.rotulo} style={{ display: 'flex', gap: 4, alignItems: 'center', color: r.ok ? undefined : 'var(--color-neutral-600)' }}>
                <i className={`ph ${r.ok ? 'ph-check' : 'ph-minus'}`} style={{ color: r.ok ? 'var(--color-success)' : undefined }} />
                {r.rotulo}
              </span>
            ))}
          </div>
        </>
      )}
      {erro && (
        <div className="erro-campo">
          <i className="ph ph-warning-circle" />
          {erro}
        </div>
      )}
    </div>
  )
}
