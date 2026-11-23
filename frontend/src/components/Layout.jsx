import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import useTituloPagina from './useTituloPagina'

// Moldura das telas do técnico: barra lateral, barra superior e conteúdo.
// No celular (index.css, até 900 px) a barra lateral vira uma gaveta aberta pelo botão de menu.
// Acessibilidade (NBR 17225): link "Pular para o conteúdo", regiões nav/header/main e título da aba por tela.
// `titulo` é o nome da tela na aba do navegador; sem ele, usa a trilha quando ela é texto.
export default function Layout({ ativo, titulo, trilha, acoes, children }) {
  const [menuAberto, setMenuAberto] = useState(false)
  useTituloPagina(titulo ?? (typeof trilha === 'string' ? trilha : null))

  // As rotas são por hash, então o link não pode mudar o hash: só leva o foco ao conteúdo.
  function pularParaConteudo(e) {
    e.preventDefault()
    document.getElementById('conteudo')?.focus()
  }

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
      <a href="#conteudo" className="pular-conteudo" onClick={pularParaConteudo}>
        Pular para o conteúdo
      </a>
      <Sidebar ativo={ativo} aberta={menuAberto} />
      <div className={`sidebar-fundo${menuAberto ? ' aberta' : ''}`} onClick={() => setMenuAberto(false)} aria-hidden="true" />
      <div className="layout-conteudo">
        <Topbar trilha={trilha} menuAberto={menuAberto} onMenu={() => setMenuAberto((v) => !v)}>
          {acoes}
        </Topbar>
        <main id="conteudo" tabIndex={-1} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
