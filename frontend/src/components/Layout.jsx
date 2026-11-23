import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

// Moldura das telas do técnico: barra lateral, barra superior e conteúdo.
// No celular (index.css, até 900 px) a barra lateral vira uma gaveta aberta pelo botão de menu.
export default function Layout({ ativo, trilha, acoes, children }) {
  const [menuAberto, setMenuAberto] = useState(false)

  // Fecha a gaveta ao trocar de tela (as rotas são por hash) e com Esc.
  useEffect(() => {
    const fechar = () => setMenuAberto(false)
    const tecla = (e) => e.key === 'Escape' && fechar()
    window.addEventListener('hashchange', fechar)
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('hashchange', fechar)
      window.removeEventListener('keydown', tecla)
    }
  }, [])

  return (
    <div className="layout">
      <Sidebar ativo={ativo} aberta={menuAberto} />
      <div className={`sidebar-fundo${menuAberto ? ' aberta' : ''}`} onClick={() => setMenuAberto(false)} aria-hidden="true" />
      <div className="layout-conteudo">
        <Topbar trilha={trilha} menuAberto={menuAberto} onMenu={() => setMenuAberto((v) => !v)}>
          {acoes}
        </Topbar>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}
