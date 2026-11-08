import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { listarClientes } from '../services/clientes'
import { listarOrdens } from '../services/ordens'
import { DadosContext } from './contexto'
import { detalhar } from './regras'

// Dados compartilhados pelas telas do técnico: quem está logado, todas as OS (barra lateral,
// Início, pendentes) e os clientes (endereço da retirada). Recarrega a cada troca de tela.
export function DadosProvider({ caminho, children }) {
  const [tecnico, setTecnico] = useState(null)
  const [ordens, setOrdens] = useState([])
  const [clientes, setClientes] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(() => {
    return Promise.all([listarOrdens(), listarClientes()])
      .then(([os, cs]) => {
        setOrdens(os.map(detalhar))
        setClientes(cs)
        setErro('')
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregado(true))
  }, [])

  useEffect(() => {
    api('/eu')
      .then(setTecnico)
      .catch(() => {})
  }, [])

  useEffect(() => {
    recarregar()
  }, [caminho, recarregar])

  const valor = useMemo(() => ({ tecnico, ordens, clientes, carregado, erro, recarregar }), [tecnico, ordens, clientes, carregado, erro, recarregar])

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>
}
