import { useDados } from '../data/contexto'
import StatusApi from './StatusApi'

const ITENS = [
  { id: 'painel', rotulo: 'OS pendentes', icone: 'ph-squares-four', href: '#/' },
  { id: 'os', rotulo: 'Buscar OS', icone: 'ph-magnifying-glass', href: '#/os' },
  { id: 'nova', rotulo: 'Abrir OS', icone: 'ph-plus-circle', href: '#/os/nova' },
  { id: 'clientes', rotulo: 'Clientes', icone: 'ph-users', href: '#/clientes' },
]

// Navegação principal da área do técnico.
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
        gap: 4,
        padding: '18px 14px',
        borderRight: '1px solid var(--color-neutral-900)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px 18px' }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 17,
          }}
        >
          <i className="ph-fill ph-wrench" />
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>ReparOS</span>
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
              color: marcado ? 'var(--color-text)' : 'var(--color-neutral-400)',
              background: marcado ? 'var(--color-neutral-900)' : 'transparent',
              boxShadow: marcado ? 'inset 2px 0 0 var(--color-accent)' : 'none',
            }}
          >
            <i className={`ph ${item.icone}`} style={{ fontSize: 18, color: marcado ? 'var(--color-accent-300)' : undefined }} />
            <span style={{ flex: 1 }}>{item.rotulo}</span>
            {item.id === 'painel' && <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{pendentes}</span>}
          </a>
        )
      })}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <StatusApi />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px 0', borderTop: '1px solid var(--color-neutral-900)' }}>
          <span className="avatar">T</span>
          <div style={{ flex: 1, lineHeight: 1.3 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Técnico</div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>tecnico@reparos.test</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
