import { useRota } from './components/roteador'
import { DadosProvider } from './data/store'
import BuscarOs from './pages/BuscarOs'
import OsPendentes from './pages/OsPendentes'

function Tela() {
  const { caminho } = useRota()

  if (caminho === '/os') return <BuscarOs />
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
