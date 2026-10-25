import { useMemo } from 'react'
import { DadosContext } from './contexto'
import * as exemplo from './exemplo'
import { diasDesde } from './regras'

// Dados de exemplo das telas. Por enquanto não há backend: nada é salvo,
// e os botões das telas só levam de uma página para outra.
export function DadosProvider({ children }) {
  const valor = useMemo(() => {
    const { clientes, equipamentos, ordens } = exemplo

    // Junta cliente e equipamento na OS para as telas não precisarem procurar.
    function detalhar(ordem) {
      const equipamento = equipamentos.find((e) => e.id === ordem.equipamento_id)
      const cliente = clientes.find((c) => c.id === equipamento?.cliente_id)
      return { ...ordem, equipamento, cliente, diasNaEtapa: diasDesde(ordem.data_status) }
    }

    function proximoNumeroOs() {
      const maior = Math.max(0, ...ordens.map((o) => Number(o.numero.slice(1))))
      return `#${String(maior + 1).padStart(4, '0')}`
    }

    return { clientes, equipamentos, ordens: ordens.map(detalhar), proximoNumeroOs }
  }, [])

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>
}
