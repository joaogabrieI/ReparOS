import { useState } from 'react'
import ClienteDialog from '../components/ClienteDialog'
import EquipamentoDialog from '../components/EquipamentoDialog'
import Layout from '../components/Layout'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { useDados } from '../data/contexto'
import { data, inicial, somenteDigitos } from '../data/formato'
import { iconeEquipamento } from '../data/status'

const GRID_OS = '76px 100px minmax(0,1fr) 220px'

// Lista de clientes com busca e ficha com equipamentos e OS anteriores (RF02, RF04, RF05, RF06).
export default function Clientes({ clienteId, novo }) {
  const { clientes, equipamentos, ordens } = useDados()
  const [busca, setBusca] = useState('')
  const [dialogo, setDialogo] = useState(novo ? { tipo: 'cliente' } : null)

  const ordenados = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome))
  const termo = busca.trim().toLowerCase()
  const digitos = somenteDigitos(busca)
  const lista = ordenados.filter(
    (c) => !termo || c.nome.toLowerCase().includes(termo) || (digitos && somenteDigitos(c.telefone_whatsapp).includes(digitos)),
  )
  const selecionado = clientes.find((c) => c.id === clienteId) ?? ordenados[0]
  const qtdEquip = (id) => equipamentos.filter((e) => e.cliente_id === id).length

  function fecharDialogo() {
    setDialogo(null)
    if (novo) navegar(selecionado ? `/clientes/${selecionado.id}` : '/clientes')
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
            <div className="pagina-subtitulo">{clientes.length} cadastrados</div>
          </div>
          <div className="input-icone">
            <i className="ph ph-magnifying-glass" />
            <input
              className="input"
              style={{ height: 38, background: 'var(--color-surface)' }}
              placeholder="Buscar por nome ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {lista.length === 0 && <div style={{ padding: 18, color: 'var(--color-neutral-500)', fontSize: 13.5 }}>Nenhum cliente encontrado.</div>}
            {lista.map((c) => {
              const marcado = c.id === selecionado?.id
              const n = qtdEquip(c.id)
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
                    <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>{c.telefone_whatsapp}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{n} equip.</span>
                </a>
              )
            })}
          </div>
        </div>

        {selecionado && (
          <FichaCliente
            cliente={selecionado}
            equipamentos={equipamentos.filter((e) => e.cliente_id === selecionado.id)}
            ordens={ordens}
            onEditar={() => setDialogo({ tipo: 'cliente', cliente: selecionado })}
            onEquipamento={(equipamento) => setDialogo({ tipo: 'equipamento', equipamento })}
          />
        )}
      </div>

      {dialogo?.tipo === 'cliente' && (
        <ClienteDialog
          cliente={dialogo.cliente}
          onFechar={fecharDialogo}
          onSalvo={(c) => {
            setDialogo(null)
            navegar(`/clientes/${c.id}`)
          }}
          onUsarExistente={(c) => {
            setDialogo(null)
            navegar(`/clientes/${c.id}`)
          }}
        />
      )}
      {dialogo?.tipo === 'equipamento' && <EquipamentoDialog cliente={selecionado} equipamento={dialogo.equipamento} onFechar={fecharDialogo} />}
    </Layout>
  )
}

function FichaCliente({ cliente, equipamentos, ordens, onEditar, onEquipamento }) {
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
              {cliente.telefone_whatsapp}
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
        <div className="card" style={{ padding: 18, color: 'var(--color-neutral-500)', fontSize: 13.5 }}>
          Nenhum equipamento cadastrado para este cliente.
        </div>
      )}

      {equipamentos.map((e) => {
        const oss = ordens.filter((o) => o.equipamento_id === e.id).sort((a, b) => b.data_abertura.localeCompare(a.data_abertura))
        const meta = [e.tipo, e.numero_serie && `nº de série ${e.numero_serie}`, oss.length === 1 ? '1 OS' : `${oss.length} OS`]
          .filter(Boolean)
          .join(' · ')
        return (
          <div key={e.id} className="card tabela">
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
                  {e.modelo} · {e.marca}
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
