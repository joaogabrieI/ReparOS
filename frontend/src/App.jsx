import { useRota } from './components/roteador'
import { DadosProvider } from './data/store'
import OsPendentes from './pages/OsPendentes'

function Tela() {
  const { caminho } = useRota()

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
