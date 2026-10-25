// Moldura das telas de login e cadastro: painel da marca à esquerda e formulário à direita.
export default function AcessoLayout({ titulo, children, largura = 380 }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div
        style={{
          width: 620,
          flex: 'none',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 56px',
          background:
            'radial-gradient(ellipse 700px 520px at 0% 100%, var(--color-accent-900), transparent 70%), linear-gradient(180deg, var(--color-surface), var(--color-bg))',
          borderRight: '1px solid var(--color-neutral-900)',
        }}
      >
        <Marca />
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>{titulo}</div>
        <div style={{ marginTop: 56, fontSize: 12, color: 'var(--color-neutral-600)' }}>© 2026 ReparOS</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '48px 120px' }}>
        <div style={{ width: largura, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  )
}

export function Marca() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="marca" style={{ width: 34, height: 34, fontSize: 18 }}>
        <i className="ph ph-wrench" />
      </span>
      <span style={{ fontWeight: 600, fontSize: 16 }}>ReparOS</span>
    </div>
  )
}

export function Destaque({ children }) {
  return <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.12, maxWidth: 460 }}>{children}</div>
}

// Fundo das telas de recuperação de senha, com cartões centralizados.
export function AcessoCentral({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: 48,
        position: 'relative',
        background: 'radial-gradient(ellipse 900px 600px at 50% 0%, var(--color-surface), var(--color-bg))',
      }}
    >
      <div style={{ position: 'absolute', top: 40, left: 48 }}>
        <Marca />
      </div>
      {children}
    </div>
  )
}

export function CartaoAcesso({ children, largura = 420 }) {
  return (
    <div
      className="painel"
      style={{ width: largura, boxShadow: 'var(--shadow-md)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {children}
    </div>
  )
}
