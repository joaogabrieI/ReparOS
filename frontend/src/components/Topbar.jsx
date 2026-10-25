// Barra superior de cada tela: trilha à esquerda e ações à direita.
export default function Topbar({ trilha, children }) {
  return (
    <div
      style={{
        height: 56,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 28px',
        borderBottom: '1px solid var(--color-neutral-900)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>{trilha}</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  )
}
