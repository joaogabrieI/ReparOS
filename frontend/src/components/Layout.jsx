import Sidebar from './Sidebar'
import Topbar from './Topbar'

// Moldura das telas do técnico: barra lateral, barra superior e conteúdo.
export default function Layout({ ativo, trilha, acoes, children }) {
  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Sidebar ativo={ativo} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar trilha={trilha}>{acoes}</Topbar>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}
