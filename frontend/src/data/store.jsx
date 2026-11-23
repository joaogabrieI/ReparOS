import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, EVENTO_TERMOS_PENDENTES } from '../services/api'
import { buscarPainel } from '../services/ordens'
import { listarUsuarios } from '../services/usuarios'
import { DadosContext } from './contexto'
import { detalhar } from './regras'

// Depois desse tempo, trocar de tela atualiza o painel (contagem da barra lateral), para ver o que outras
// pessoas da equipe mudaram. Antes disso, a troca de tela não faz nenhum pedido à API.
const PAINEL_VALIDO_MS = 60_000

function painelDetalhado(p) {
  const agenda = p.agenda.map((c) => ({ ...c, ordem: detalhar(c.ordem) }))
  return { ...p, agenda, acoes: p.acoes.map(detalhar), atividade: p.atividade.map(detalhar) }
}

// Dados compartilhados pelas telas da assistência: quem está logado (com a assistência e o perfil), a equipe
// (escolha do técnico responsável) e o painel (/api/painel: contagens, agenda, ações e atividade recente),
// usado pela barra lateral, pelo Início e pelas OS pendentes. Cada tela busca as listas de que precisa
// (OS, clientes); aqui não se carrega mais a lista inteira de OS e de clientes a cada troca de tela.
// `recarregar()` atualiza o painel depois de uma alteração; a equipe só muda pela tela Equipe
// (`recarregarUsuarios()`).
export function DadosProvider({ caminho, children }) {
  const [usuario, setUsuario] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [painel, setPainel] = useState(null)
  const [erro, setErro] = useState('')
  const painelEm = useRef(0)

  const recarregar = useCallback(() => {
    painelEm.current = Date.now()
    return buscarPainel()
      .then((p) => {
        setPainel(painelDetalhado(p))
        setErro('')
      })
      .catch((e) => {
        painelEm.current = 0
        setErro(e.message)
      })
  }, [])

  const recarregarUsuarios = useCallback(
    () =>
      listarUsuarios()
        .then(setUsuarios)
        .catch((e) => setErro(e.message)),
    [],
  )

  // termos_pendentes: falta aceitar os Termos de uso e a Política de privacidade (ver PortaoTermos no App).
  const recarregarUsuario = useCallback(() => api('/eu').then(setUsuario).catch(() => {}), [])

  useEffect(() => {
    recarregarUsuario()
    recarregarUsuarios()
  }, [recarregarUsuario, recarregarUsuarios])

  // A API recusou por falta do aceite dos termos (ex.: versão nova publicada com o sistema aberto):
  // recarrega o usuário, que volta com termos_pendentes, e o PortaoTermos mostra a tela de aceite.
  useEffect(() => {
    window.addEventListener(EVENTO_TERMOS_PENDENTES, recarregarUsuario)
    return () => window.removeEventListener(EVENTO_TERMOS_PENDENTES, recarregarUsuario)
  }, [recarregarUsuario])

  // Troca de tela: só atualiza o painel quando ele já tem mais de um minuto (ou ainda não veio).
  useEffect(() => {
    if (Date.now() - painelEm.current > PAINEL_VALIDO_MS) recarregar()
  }, [caminho, recarregar])

  const admin = usuario?.perfil === 'admin'
  const carregado = painel !== null
  const valor = useMemo(
    () => ({ usuario, admin, usuarios, painel, carregado, erro, recarregar, recarregarUsuarios, recarregarUsuario }),
    [usuario, admin, usuarios, painel, carregado, erro, recarregar, recarregarUsuarios, recarregarUsuario],
  )

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>
}
