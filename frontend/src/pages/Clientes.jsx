import { useEffect, useState } from 'react'
import ClienteDialog from '../components/ClienteDialog'
import EquipamentoDialog from '../components/EquipamentoDialog'
import Layout from '../components/Layout'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { data, inicial, nomeEquipamento, telefone } from '../data/formato'
import { iconeEquipamento } from '../data/status'
import { buscarCliente, listarClientes, salvarCliente } from '../services/clientes'
import { listarEquipamentos, salvarEquipamento } from '../services/equipamentos'

const GRID_OS = '160px 100px minmax(0,1fr) 220px'

// Lista de clientes com busca e ficha com equipamentos e OS anteriores (RF02, RF04, RF05, RF06).
// Os dados vêm da API (/api/clientes e /api/equipamentos). A busca também acha equipamentos
// por modelo ou número de série e leva à ficha do dono.
export default function Clientes({ clienteId, novo }) {
  const [clientes, setClientes] = useState(null)
  const [encontrados, setEncontrados] = useState(null)
  const [equipamentosEncontrados, setEquipamentosEncontrados] = useState([])
  const [ficha, setFicha] = useState(null)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)
  const [busca, setBusca] = useState('')
  const [dialogo, setDialogo] = useState(novo ? { tipo: 'cliente' } : null)

  // Todos os clientes: contagem, aviso de telefone repetido e cliente aberto por padrão.
  useEffect(() => {
    listarClientes()
      .then(setClientes)
      .catch((e) => setErro(e.message))
  }, [versao])

  // Busca por nome ou telefone feita na API, com uma pequena espera enquanto digita.
  useEffect(() => {
    if (!busca.trim()) return
    let ativo = true
    const espera = setTimeout(() => {
      Promise.all([listarClientes(busca), listarEquipamentos({ busca })])
        .then(([lista, equipamentos]) => {
          if (!ativo) return
          setEncontrados(lista)
          setEquipamentosEncontrados(equipamentos)
        })
        .catch((e) => ativo && setErro(e.message))
    }, 250)
    return () => {
      ativo = false
      clearTimeout(espera)
    }
  }, [busca, versao])

  const selecionadoId = clienteId ?? clientes?.[0]?.id

  useEffect(() => {
    if (!selecionadoId) return
    let ativo = true
    buscarCliente(selecionadoId)
      .then((c) => ativo && setFicha(c))
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [selecionadoId, versao])

  // Enquanto a busca não volta, a lista mostra o resultado anterior.
  const lista = (busca.trim() ? (encontrados ?? clientes) : clientes) ?? []
  const equipamentosNaBusca = busca.trim() ? equipamentosEncontrados : []
  const selecionado = ficha?.id === selecionadoId ? ficha : null

  function fecharDialogo() {
    setDialogo(null)
    if (novo) navegar(selecionadoId ? `/clientes/${selecionadoId}` : '/clientes')
  }

  function clienteSalvo(salvo) {
    setDialogo(null)
    setVersao((v) => v + 1)
    navegar(`/clientes/${salvo.id}`)
  }

  function equipamentoSalvo() {
    setDialogo(null)
    setVersao((v) => v + 1)
  }

  return (
    <Layout
      ativo="clientes"
      trilha={
        <>
          Clientes{selecionado && <> / <span style={{ color: 'var(--color-text)' }}>{selecionado.nome}</span></>}
        </>
      }
      acoes={
        <button className="btn btn-primary" onClick={() => setDialogo({ tipo: 'cliente' })}>
          <i className="ph ph-user-plus" />
          Novo cliente
        </button>
      }
    >
      <div style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: '400px minmax(0,1fr)' }}>
        <div style={{ padding: '24px 20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: '1px solid var(--color-neutral-900)' }}>
          <div>
            <div className="pagina-titulo">Clientes</div>
            <div className="pagina-subtitulo">{clientes ? `${clientes.length} cadastrados` : 'Carregando…'}</div>
          </div>
          <div className="input-icone">
            <i className="ph ph-magnifying-glass" />
            <input
              className="input"
              style={{ minHeight: 38 }}
              placeholder="Buscar por nome, telefone ou equipamento"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="painel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {erro && <div className="erro-campo" style={{ padding: 18, marginTop: 0 }}>{erro}</div>}
            {!erro && clientes && lista.length === 0 && equipamentosNaBusca.length === 0 && <div style={{ padding: 18, color: 'var(--color-neutral-500)', fontSize: 13.5 }}>Nenhum cliente encontrado.</div>}
            {lista.map((c) => {
              const marcado = c.id === selecionadoId
              const n = c.equipamentos_count
              return (
                <a
                  key={c.id}
                  href={`#/clientes/${c.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 14px',
                    borderBottom: '1px solid var(--color-neutral-900)',
                    color: 'inherit',
                    background: marcado ? 'var(--color-accent-900)' : 'transparent',
                    boxShadow: marcado ? 'inset 2px 0 0 var(--color-accent)' : 'none',
                  }}
                >
                  <span className="avatar">{inicial(c.nome)}</span>
                  <div style={{ flex: 1, lineHeight: 1.35 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{c.nome}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>{telefone(c.telefone_whatsapp)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{n} equip.</span>
                </a>
              )
            })}
            {equipamentosNaBusca.length > 0 && (
              <div style={{ padding: '10px 14px 6px', fontSize: 12, color: 'var(--color-neutral-500)', borderBottom: '1px solid var(--color-neutral-900)' }}>
                Equipamentos
              </div>
            )}
            {equipamentosNaBusca.map((e) => (
              <a
                key={`e${e.id}`}
                href={`#/clientes/${e.cliente_id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--color-neutral-900)', color: 'inherit' }}
              >
                <span className="avatar">
                  <i className={`ph ${iconeEquipamento(e.tipo)}`} />
                </span>
                <div style={{ flex: 1, lineHeight: 1.35, minWidth: 0 }}>
                  <div className="truncar" style={{ fontSize: 14, fontWeight: 500 }}>
                    {nomeEquipamento(e)}
                  </div>
                  <div className="truncar" style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>
                    {[e.cliente.nome, e.numero_serie && `nº de série ${e.numero_serie}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {selecionado && (
          <FichaCliente
            cliente={selecionado}
            onEditar={() => setDialogo({ tipo: 'cliente', cliente: selecionado })}
            onEquipamento={(equipamento) => setDialogo({ tipo: 'equipamento', equipamento })}
          />
        )}
      </div>

      {dialogo?.tipo === 'cliente' && (
        <ClienteDialog
          cliente={dialogo.cliente}
          clientes={clientes ?? []}
          onSalvar={(dados) => salvarCliente(dados, dialogo.cliente?.id)}
          onFechar={fecharDialogo}
          onSalvo={clienteSalvo}
          onUsarExistente={(c) => {
            setDialogo(null)
            navegar(`/clientes/${c.id}`)
          }}
        />
      )}
      {dialogo?.tipo === 'equipamento' && (
        <EquipamentoDialog
          cliente={selecionado}
          equipamento={dialogo.equipamento}
          onSalvar={(dados) => salvarEquipamento(dados, dialogo.equipamento?.id)}
          onFechar={fecharDialogo}
          onSalvo={equipamentoSalvo}
        />
      )}
    </Layout>
  )
}

function FichaCliente({ cliente, onEditar, onEquipamento }) {
  const { equipamentos } = cliente

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <span className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
          {inicial(cliente.nome)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>{cliente.nome}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', fontSize: 13.5, color: 'var(--color-neutral-400)', marginTop: 4 }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <i className="ph ph-whatsapp-logo" />
              {telefone(cliente.telefone_whatsapp)}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <i className="ph ph-map-pin" />
              {cliente.endereco}
            </span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onEditar}>
          <i className="ph ph-pencil-simple" />
          Editar dados
        </button>
        <a className="btn btn-primary" href={`#/os/nova?cliente=${cliente.id}`}>
          <i className="ph ph-plus" />
          Abrir OS
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Equipamentos ({equipamentos.length})</span>
        <button className="btn btn-ghost" onClick={() => onEquipamento(null)}>
          <i className="ph ph-plus" />
          Cadastrar equipamento
        </button>
      </div>

      {equipamentos.length === 0 && (
        <div className="painel" style={{ padding: 18, color: 'var(--color-neutral-500)', fontSize: 13.5 }}>
          Nenhum equipamento cadastrado para este cliente.
        </div>
      )}

      {equipamentos.map((e) => {
        const oss = e.ordens_servico
        const meta = [e.tipo, e.numero_serie && `nº de série ${e.numero_serie}`, oss.length === 1 ? '1 OS' : `${oss.length} OS`]
          .filter(Boolean)
          .join(' · ')
        return (
          <div key={e.id} className="painel tabela">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: oss.length ? '1px solid var(--color-neutral-800)' : 'none' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-neutral-900)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 21,
                  color: 'var(--color-neutral-300)',
                }}
              >
                <i className={`ph ${iconeEquipamento(e.tipo)}`} />
              </div>
              <div style={{ flex: 1, lineHeight: 1.35 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  {nomeEquipamento(e)}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>{meta}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '0 8px' }} onClick={() => onEquipamento(e)} aria-label="Editar equipamento">
                <i className="ph ph-pencil-simple" style={{ color: 'var(--color-neutral-500)' }} />
              </button>
            </div>
            {oss.map((o) => (
              <button key={o.id} className="tabela-linha" style={{ gridTemplateColumns: GRID_OS }} onClick={() => navegar(`/os/${o.id}`)}>
                <span className="mono">{o.numero}</span>
                <span style={{ color: 'var(--color-neutral-400)' }}>{data(o.data_abertura)}</span>
                <span className="truncar" style={{ color: 'var(--color-neutral-300)' }}>
                  {o.problema_relatado}
                </span>
                <span style={{ textAlign: 'right' }}>
                  <Pill status={o.status} />
                </span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
