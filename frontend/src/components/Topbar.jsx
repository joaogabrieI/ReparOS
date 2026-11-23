// Barra superior de cada tela: trilha à esquerda e ações à direita.
// O botão de menu só aparece no celular, onde a barra lateral fica escondida.
export default function Topbar({ trilha, menuAberto = false, onMenu, children }) {
  return (
    <header className="topbar">
      {onMenu && (
        <button
          type="button"
          className="btn btn-icon so-celular"
          onClick={onMenu}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
        >
          <i className={`ph ${menuAberto ? 'ph-x' : 'ph-list'}`} style={{ fontSize: 20 }} aria-hidden="true" />
        </button>
      )}
      <span className="topbar-trilha" style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>
        {trilha}
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </header>
  )
}
