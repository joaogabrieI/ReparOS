import { useEffect, useState } from 'react'

// Navegação simples por hash (#/clientes/3?x=1), sem dependências extras.
function lerHash() {
  const [caminho, busca = ''] = window.location.hash.replace(/^#/, '').split('?')
  return { caminho: caminho || '/', params: new URLSearchParams(busca) }
}

export function useRota() {
  const [rota, setRota] = useState(lerHash)
  useEffect(() => {
    const atualizar = () => setRota(lerHash())
    window.addEventListener('hashchange', atualizar)
    return () => window.removeEventListener('hashchange', atualizar)
  }, [])
  return rota
}

export function navegar(caminho) {
  window.location.hash = caminho
}
