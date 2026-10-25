import { useMemo, useState } from 'react'
import { DadosContext } from './contexto'
import * as exemplo from './exemplo'
import { diasDesde } from './regras'

// Estado em memória das telas. Quando as rotas de clientes e OS existirem na API,
// estas funções passam a chamar services/api.js.
export function DadosProvider({ children }) {
  const [clientes, setClientes] = useState(exemplo.clientes)
  const [equipamentos, setEquipamentos] = useState(exemplo.equipamentos)
  const [ordens, setOrdens] = useState(exemplo.ordens)

  const valor = useMemo(() => {
    const proximoId = (lista) => Math.max(0, ...lista.map((i) => i.id)) + 1

    function cadastrarCliente(dados) {
      const cliente = { ...dados, id: proximoId(clientes) }
      setClientes((atual) => [...atual, cliente])
      return cliente
    }

    function atualizarCliente(id, dados) {
      setClientes((atual) => atual.map((c) => (c.id === id ? { ...c, ...dados } : c)))
    }

    function cadastrarEquipamento(dados) {
      const equipamento = { ...dados, id: proximoId(equipamentos) }
      setEquipamentos((atual) => [...atual, equipamento])
      return equipamento
    }

    function atualizarEquipamento(id, dados) {
      setEquipamentos((atual) => atual.map((e) => (e.id === id ? { ...e, ...dados } : e)))
    }

    function proximoNumeroOs() {
      const maior = Math.max(0, ...ordens.map((o) => Number(o.numero.slice(1))))
      return `#${String(maior + 1).padStart(4, '0')}`
    }

    function abrirOs({ equipamento_id, problema_relatado, retirada_agendada, retirada_local }) {
      const agora = new Date().toISOString()
      const ordem = {
        id: proximoId(ordens),
        numero: proximoNumeroOs(),
        equipamento_id,
        status: 'aberta',
        problema_relatado,
        data_abertura: agora,
        data_status: agora,
        retirada_agendada,
        retirada_local,
        data_retirada: null,
        diagnostico: '',
        servico_executado: '',
        pecas_trocadas: '',
        data_entrega: null,
        orcamento: null,
        historico: [{ status_anterior: null, status_novo: 'aberta', data_hora: agora }],
      }
      setOrdens((atual) => [ordem, ...atual])
      return ordem
    }

    // Aplica alterações na OS e, se o status mudar, registra no histórico (RF22).
    function atualizarOs(id, alteracoes, novoStatus) {
      setOrdens((atual) =>
        atual.map((o) => {
          if (o.id !== id) return o
          const agora = new Date().toISOString()
          const ordem = { ...o, ...alteracoes }
          if (novoStatus && novoStatus !== o.status) {
            ordem.status = novoStatus
            ordem.data_status = agora
            ordem.historico = [...o.historico, { status_anterior: o.status, status_novo: novoStatus, data_hora: agora }]
          }
          return ordem
        }),
      )
    }

    // Junta cliente e equipamento na OS para as telas não precisarem procurar.
    function detalhar(ordem) {
      const equipamento = equipamentos.find((e) => e.id === ordem.equipamento_id)
      const cliente = clientes.find((c) => c.id === equipamento?.cliente_id)
      return { ...ordem, equipamento, cliente, diasNaEtapa: diasDesde(ordem.data_status) }
    }

    return {
      clientes,
      equipamentos,
      ordens: ordens.map(detalhar),
      proximoNumeroOs,
      cadastrarCliente,
      atualizarCliente,
      cadastrarEquipamento,
      atualizarEquipamento,
      abrirOs,
      atualizarOs,
    }
  }, [clientes, equipamentos, ordens])

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>
}
