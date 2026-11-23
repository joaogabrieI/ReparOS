// Moldura das telas de login e cadastro: painel da marca à esquerda e formulário à direita.
export default function AcessoLayout({ titulo, children, largura = 380 }) {
  return (
    <div className="acesso">
      {/* No celular o painel da marca some e o formulário ocupa a tela (index.css). */}
      <div className="acesso-marca">
        <Marca />
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>{titulo}</div>
        <div style={{ marginTop: 56, fontSize: 12, color: 'var(--color-neutral-600)' }}>© 2026 ReparOS</div>
      </div>
      <main className="acesso-form">
        <div style={{ width: largura, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </main>
    </div>
  )
}

export function Marca() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="marca" style={{ width: 34, height: 34, fontSize: 18 }}>
        <i className="ph ph-wrench" aria-hidden="true" />
      </span>
      <span style={{ fontWeight: 600, fontSize: 16 }}>ReparOS</span>
    </div>
  )
}

export function Destaque({ children }) {
  return <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.12, maxWidth: 460 }}>{children}</div>
}

// Fundo das telas de recuperação de senha e de acompanhamento, com cartões centralizados.
// No celular a marca sai do canto e fica acima do cartão (index.css).
export function AcessoCentral({ children }) {
  return (
    <div className="acesso-central">
      <div className="acesso-central-marca">
        <Marca />
      </div>
      <main style={{ display: 'contents' }}>{children}</main>
    </div>
  )
}

// largura é o máximo: em telas estreitas o cartão ocupa a largura disponível.
export function CartaoAcesso({ children, largura = 420 }) {
  return (
    <div className="painel cartao-acesso" style={{ width: largura }}>
      {children}
    </div>
  )
}
