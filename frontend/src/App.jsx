import { useRota } from './components/roteador'
import { DadosProvider } from './data/store'
import AbrirOs from './pages/AbrirOs'
import BuscarOs from './pages/BuscarOs'
import Clientes from './pages/Clientes'
import DetalheOs from './pages/DetalheOs'
import OsPendentes from './pages/OsPendentes'

function Tela() {
  const { caminho, params } = useRota()
  const partes = caminho.split('/').filter(Boolean)

  if (caminho === '/os') return <BuscarOs />
  if (caminho === '/os/nova') {
    const cliente = Number(params.get('cliente')) || undefined
    return <AbrirOs key={cliente} clienteInicial={cliente} />
  }
  if (partes[0] === 'os' && partes[1]) return <DetalheOs key={partes[1]} id={Number(partes[1])} />
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
