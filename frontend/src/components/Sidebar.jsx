import { useDados } from '../data/contexto'
import { tecnico } from '../data/exemplo'

const ITENS = [
  { id: 'inicio', rotulo: 'Início', icone: 'ph-house', href: '#/' },
  { id: 'painel', rotulo: 'OS pendentes', icone: 'ph-kanban', href: '#/pendentes' },
  { id: 'os', rotulo: 'Buscar OS', icone: 'ph-magnifying-glass', href: '#/os' },
  { id: 'nova', rotulo: 'Abrir OS', icone: 'ph-plus-circle', href: '#/os/nova' },
  { id: 'clientes', rotulo: 'Clientes', icone: 'ph-users', href: '#/clientes' },
]

function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase()
}

// Navegação principal da área do técnico (ReparOSSidebar, nav v2).
export default function Sidebar({ ativo }) {
  const { ordens } = useDados()
  const pendentes = ordens.filter((o) => o.status !== 'entregue').length

  return (
    <aside
      style={{
        width: 232,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '18px 12px',
        borderRight: '1px solid var(--color-neutral-900)',
        background: 'linear-gradient(180deg, var(--color-surface), var(--color-bg))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 18px' }}>
        <span className="marca">
          <i className="ph ph-wrench" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
          <span className="truncar" style={{ fontWeight: 600, fontSize: 14.5 }}>
            {tecnico.nome_assistencia}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-500)' }}>ReparOS</span>
        </div>
      </div>

      {ITENS.map((item) => {
        const marcado = item.id === ativo
        return (
          <a
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 36,
              padding: '0 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13.5,
              color: marcado ? 'var(--color-accent-200)' : 'var(--color-neutral-400)',
              background: marcado ? 'var(--color-accent-900)' : 'transparent',
              boxShadow: marcado ? 'inset 2px 0 0 var(--color-accent)' : 'none',
            }}
          >
            <i className={`ph ${item.icone}`} style={{ fontSize: 18 }} />
            <span style={{ flex: 1 }}>{item.rotulo}</span>
            {item.id === 'painel' && pendentes > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: 999,
                  background: 'var(--color-neutral-800)',
                  color: 'var(--color-neutral-300)',
                }}
              >
                {pendentes}
              </span>
            )}
          </a>
        )
      })}

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 8px',
          borderTop: '1px solid var(--color-neutral-900)',
        }}
      >
        <span className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: 'var(--color-neutral-800)', color: 'var(--color-neutral-200)' }}>
          {iniciais(tecnico.nome)}
        </span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
          <span className="truncar" style={{ fontSize: 13 }}>
            {tecnico.nome}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-500)' }}>Técnico</span>
        </div>
        <a className="btn btn-icon" style={{ width: 30, height: 30, color: 'var(--color-neutral-500)' }} href="#/entrar" title="Sair" aria-label="Sair">
          <i className="ph ph-sign-out" />
        </a>
      </div>
    </aside>
  )
}
