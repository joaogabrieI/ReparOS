import StatusApi from '../components/StatusApi'

export default function Inicio() {
  return (
    <main className="inicio">
      <h1>ReparOS</h1>
      <p>Gestão de ordens de serviço para assistências técnicas.</p>
      <StatusApi />
    </main>
  )
}
