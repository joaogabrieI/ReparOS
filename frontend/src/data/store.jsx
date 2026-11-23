import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { listarClientes } from '../services/clientes'
import { listarOrdens } from '../services/ordens'
import { listarUsuarios } from '../services/usuarios'
import { DadosContext } from './contexto'
import { detalhar } from './regras'

// Dados compartilhados pelas telas da assistência: quem está logado (com a assistência e o perfil),
// a equipe (escolha do técnico responsável), todas as OS (barra lateral, Início, pendentes) e os
// clientes (endereço da retirada). Recarrega a cada troca de tela.
export function DadosProvider({ caminho, children }) {
  const [usuario, setUsuario] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [ordens, setOrdens] = useState([])
  const [clientes, setClientes] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(() => {
    return Promise.all([listarOrdens(), listarClientes(), listarUsuarios()])
      .then(([os, cs, us]) => {
        setOrdens(os.map(detalhar))
        setClientes(cs)
        setUsuarios(us)
        setErro('')
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregado(true))
  }, [])

  // termos_pendentes: falta aceitar os Termos de uso e a Política de privacidade (ver PortaoTermos no App).
  const recarregarUsuario = useCallback(() => api('/eu').then(setUsuario).catch(() => {}), [])

  useEffect(() => {
    recarregarUsuario()
  }, [recarregarUsuario])

  useEffect(() => {
    recarregar()
  }, [caminho, recarregar])

  const admin = usuario?.perfil === 'admin'
  const valor = useMemo(
    () => ({ usuario, admin, usuarios, ordens, clientes, carregado, erro, recarregar, recarregarUsuario }),
    [usuario, admin, usuarios, ordens, clientes, carregado, erro, recarregar, recarregarUsuario],
  )

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>
}
