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

  const cor = estado.carregando ? 'var(--color-neutral-500)' : estado.erro ? 'var(--color-danger)' : 'var(--color-success)'
  const texto = estado.carregando ? 'Verificando a API...' : estado.erro ? 'API indisponível' : `API online · banco ${estado.dados.banco}`

  return (
    <div title={estado.erro} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', fontSize: 12, color: 'var(--color-neutral-500)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cor }} />
      {texto}
    </div>
  )
}
