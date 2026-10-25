import { infoStatus } from '../data/status'

// Etiqueta colorida com o status da OS.
export default function Pill({ status }) {
  const info = infoStatus(status)
  const h = info.matiz
  const estilo =
    h == null
      ? { color: 'var(--color-neutral-300)', background: 'var(--color-neutral-900)', border: '1px solid var(--color-neutral-800)' }
      : { color: `oklch(0.84 0.1 ${h})`, background: `oklch(0.82 0.1 ${h} / 0.1)`, border: `1px solid oklch(0.82 0.1 ${h} / 0.32)` }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...estilo,
      }}
    >
      {info.rotulo}
    </span>
  )
}
