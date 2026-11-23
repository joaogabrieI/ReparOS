import { useEffect } from 'react'

// Título da aba do navegador por tela (NBR 17225 / WCAG 2.4.2): "Tela · ReparOS".
// Leitores de tela anunciam o título quando a tela muda, então cada rota precisa do seu.
export default function useTituloPagina(titulo) {
  useEffect(() => {
    if (titulo) document.title = `${titulo} · ReparOS`
  }, [titulo])
}
