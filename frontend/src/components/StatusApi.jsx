import { useEffect, useState } from 'react'
import { api } from '../services/api'

// Mostra se o frontend consegue falar com o backend (teste de CORS e conexão).
export default function StatusApi() {
  const [estado, setEstado] = useState({ carregando: true })

  useEffect(() => {
    api('/status')
      .then((dados) => setEstado({ dados }))
      .catch((erro) => setEstado({ erro: erro.message }))
  }, [])

  if (estado.carregando) return <p className="status">Verificando a API...</p>
  if (estado.erro) return <p className="status erro">API indisponível: {estado.erro}</p>

  const { app, banco } = estado.dados
  return (
    <p className="status ok">
      API {app} online · banco de dados: {banco}
    </p>
  )
}
