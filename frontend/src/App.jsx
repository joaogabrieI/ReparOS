import { useRota } from './components/roteador'
import { DadosProvider } from './data/store'
import AbrirOs from './pages/AbrirOs'
import BuscarOs from './pages/BuscarOs'
import Cadastro from './pages/Cadastro'
import Clientes from './pages/Clientes'
import DetalheOs from './pages/DetalheOs'
import Entrar from './pages/Entrar'
import Inicio from './pages/Inicio'
import NovaSenha from './pages/NovaSenha'
import OsPendentes from './pages/OsPendentes'
import RecuperarSenha from './pages/RecuperarSenha'

function Tela() {
  const { caminho, params } = useRota()
  const partes = caminho.split('/').filter(Boolean)

  // Telas de acesso: entrar, criar conta e recuperar senha.
  if (caminho === '/entrar') return <Entrar />
  if (caminho === '/cadastro') return <Cadastro />
  if (caminho === '/esqueci-senha') return <RecuperarSenha />
  if (caminho === '/nova-senha') return <NovaSenha email={params.get('email')} />

  // Telas do técnico.
  if (caminho === '/pendentes') return <OsPendentes key={params.toString()} buscaInicial={params.get('busca') ?? ''} />
  if (caminho === '/os') return <BuscarOs />
  if (caminho === '/os/nova') {
    const cliente = Number(params.get('cliente')) || undefined
    return <AbrirOs key={cliente} clienteInicial={cliente} />
  }
  if (partes[0] === 'os' && partes[1]) return <DetalheOs key={partes[1]} id={Number(partes[1])} />
  if (partes[0] === 'clientes') {
    if (partes[1] === 'novo') return <Clientes key="novo" novo />
    return <Clientes key="lista" clienteId={Number(partes[1]) || undefined} />
  }
  return <Inicio />
}

function App() {
  return (
    <DadosProvider>
      <Tela />
    </DadosProvider>
  )
}

export default App
