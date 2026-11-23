import { useRota } from './components/roteador'
import { useDados } from './data/contexto'
import { DadosProvider } from './data/store'
import AceitarTermos from './pages/AceitarTermos'
import AbrirOs from './pages/AbrirOs'
import Acompanhar from './pages/Acompanhar'
import Atividades from './pages/Atividades'
import BuscarOs from './pages/BuscarOs'
import Cadastro from './pages/Cadastro'
import Clientes from './pages/Clientes'
import DetalheOs from './pages/DetalheOs'
import Documento from './pages/Documento'
import Entrar from './pages/Entrar'
import Equipe from './pages/Equipe'
import Inicio from './pages/Inicio'
import NovaSenha from './pages/NovaSenha'
import OsPendentes from './pages/OsPendentes'
import RecuperarSenha from './pages/RecuperarSenha'

// Telas da assistência: todas usam os dados compartilhados da API (DadosProvider).
function TelaTecnico({ caminho, params }) {
  const partes = caminho.split('/').filter(Boolean)

  if (caminho === '/pendentes') return <OsPendentes key={params.toString()} buscaInicial={params.get('busca') ?? ''} />
  if (caminho === '/os') return <BuscarOs minhas={params.has('minhas')} />
  if (caminho === '/equipe') return <Equipe />
  if (caminho === '/atividades') return <Atividades key={params.toString()} entidade={params.get('entidade') ?? ''} entidadeId={params.get('entidade_id') ?? ''} />
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

// Sem o aceite das versões atuais dos Termos de uso e da Política de privacidade, o sistema não abre
// (a API também recusa as rotas do sistema, ver ExigeAceiteTermos no backend).
function PortaoTermos({ children }) {
  const { usuario, recarregarUsuario, recarregar, recarregarUsuarios } = useDados()
  // Depois do aceite, recarrega também o painel e a equipe, que a API recusou enquanto faltava o aceite.
  const aoAceitar = () => Promise.all([recarregarUsuario(), recarregar(), recarregarUsuarios()])
  if (usuario?.termos_pendentes) return <AceitarTermos usuario={usuario} onAceito={aoAceitar} />
  return children
}

function App() {
  const { caminho, params } = useRota()
  const partes = caminho.split('/').filter(Boolean)

  // Telas de acesso: entrar, criar conta e recuperar senha.
  if (caminho === '/entrar') return <Entrar expirou={params.has('expirou')} />
  if (caminho === '/cadastro') return <Cadastro />
  if (caminho === '/esqueci-senha') return <RecuperarSenha />
  // Termos de uso e Política de privacidade: páginas públicas, abertas a partir do cadastro e da tela do cliente.
  if (caminho === '/termos') return <Documento tipo="termos" />
  if (caminho === '/privacidade') return <Documento tipo="privacidade" />
  if (caminho === '/nova-senha') return <NovaSenha token={params.get('token') ?? ''} email={params.get('email') ?? ''} />

  // Área do cliente, sem login: só consulta o andamento da OS pelo número.
  if (partes[0] === 'acompanhar')
    return (
      <Acompanhar
        key={partes[1] ?? ''}
        numeroInicial={partes[1] ? decodeURIComponent(partes[1]) : ''}
      />
    )

  return (
    <DadosProvider caminho={caminho}>
      <PortaoTermos>
        <TelaTecnico caminho={caminho} params={params} />
      </PortaoTermos>
    </DadosProvider>
  )
}

export default App
