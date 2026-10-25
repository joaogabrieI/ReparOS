import { useRota } from './components/roteador'
import { DadosProvider } from './data/store'
import BuscarOs from './pages/BuscarOs'
import Clientes from './pages/Clientes'
import OsPendentes from './pages/OsPendentes'

function Tela() {
  const { caminho } = useRota()

  const partes = caminho.split('/').filter(Boolean)

  if (caminho === '/os') return <BuscarOs />
  if (partes[0] === 'clientes') {
    if (partes[1] === 'novo') return <Clientes novo />
    return <Clientes clienteId={Number(partes[1]) || undefined} />
  }
  return <OsPendentes key={caminho} />
}

function App() {
  return (
    <DadosProvider>
      <Tela />
    </DadosProvider>
  )
}

export default App
