import { useEffect, useState } from 'react'
import ClienteDialog from '../components/ClienteDialog'
import EquipamentoCampos from '../components/EquipamentoCampos'
import Layout from '../components/Layout'
import ErroCampo from '../components/ErroCampo'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { useDados } from '../data/contexto'
import { dataHora, diaMes, nomeEquipamento, telefone, telefoneNormalizado } from '../data/formato'
import { EQUIPAMENTO_VAZIO } from '../data/regras'
import { iconeEquipamento } from '../data/status'
import { buscarCliente, salvarCliente } from '../services/clientes'
import { salvarEquipamento } from '../services/equipamentos'
import { abrirOrdem } from '../services/ordens'

const NOVO = 'novo'

function Etapa({ numero, titulo, extra, children }) {
  return (
    <div className="painel painel-pad" style={{ gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '1px solid var(--color-accent)',
            color: 'var(--color-accent-300)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
          }}
        >
          {numero}
        </span>
        {titulo}
        {extra && <span style={{ marginLeft: 'auto' }}>{extra}</span>}
      </div>
      {children}
    </div>
  )
}

function Opcao({ marcada, onClick, icone, titulo, detalhe }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={marcada ?? false}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${marcada ? 'var(--color-accent)' : 'var(--color-neutral-800)'}`,
        background: marcada ? 'var(--color-accent-900)' : 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          flex: 'none',
          borderRadius: '50%',
          border: `1.5px solid ${marcada ? 'var(--color-accent)' : 'var(--color-neutral-600)'}`,
          background: marcada ? 'var(--color-accent)' : 'transparent',
          boxShadow: marcada ? 'inset 0 0 0 3px var(--color-accent-900)' : 'none',
        }}
      />
      <i className={`ph ${icone}`} style={{ fontSize: 20, color: marcada ? 'var(--color-accent-300)' : 'var(--color-neutral-400)' }} />
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>
        <div>{titulo}</div>
        <div style={{ color: 'var(--color-neutral-500)', fontSize: 12 }}>{detalhe}</div>
      </div>
    </button>
  )
}

function LinhaResumo({ rotulo, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13.5 }}>
      <span style={{ color: 'var(--color-neutral-400)' }}>{rotulo}</span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  )
}

// Abertura de OS: cliente, equipamento, problema relatado e retirada combinada (RF02, RF05, RF07, RF08).
// Clientes e equipamentos vêm da API; um equipamento novo é cadastrado antes de abrir a OS.
export default function AbrirOs({ clienteInicial }) {
  const { clientes, recarregar } = useDados()
  const [clienteId, setClienteId] = useState(clienteInicial ?? null)
  const [ficha, setFicha] = useState(null)
  const [busca, setBusca] = useState('')
  const [novoCliente, setNovoCliente] = useState(false)
  const [equipamentoId, setEquipamentoId] = useState(null)
  const [novoEquip, setNovoEquip] = useState(EQUIPAMENTO_VAZIO)
  const [problema, setProblema] = useState('')
  const [retiradaData, setRetiradaData] = useState('')
  const [retiradaHora, setRetiradaHora] = useState('')
  const [agora] = useState(() => new Date().toISOString())
  const [erros, setErros] = useState({})
  const [errosEquip, setErrosEquip] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Ficha do cliente escolhido: equipamentos e as OS de cada um.
  useEffect(() => {
    if (!clienteId) return
    let ativo = true
    buscarCliente(clienteId)
      .then((c) => {
        if (!ativo) return
        setFicha(c)
        setEquipamentoId((atual) => atual ?? (c.equipamentos.length ? c.equipamentos[0].id : NOVO))
      })
      .catch((e) => ativo && setErroGeral(e.message))
    return () => {
      ativo = false
    }
  }, [clienteId])

  const cliente = ficha?.id === clienteId ? ficha : null
  const doCliente = cliente?.equipamentos ?? []
  const equipamento = doCliente.find((e) => e.id === equipamentoId)

  const termo = busca.trim().toLowerCase()
  const digitos = telefoneNormalizado(busca)
  const sugestoes = termo
    ? clientes.filter((c) => c.nome.toLowerCase().includes(termo) || (digitos && c.telefone_whatsapp.includes(digitos))).slice(0, 5)
    : []

  function escolherCliente(c) {
    setClienteId(c.id)
    setBusca('')
    setNovoCliente(false)
    // O mesmo cliente de novo não recarrega a ficha: escolhe o primeiro equipamento aqui.
    setEquipamentoId(c.id === cliente?.id ? (doCliente[0]?.id ?? NOVO) : null)
  }

  async function salvar() {
    setErros({})
    setErrosEquip({})
    setErroGeral('')
    if (!cliente) return setErroGeral('Escolha o cliente.')
    if (!retiradaData || !retiradaHora) return setErros({ retirada_agendada: ['Informe a data e o horário combinados para a retirada.'] })

    setEnviando(true)
    try {
      let idEquipamento = equipamentoId
      if (equipamentoId === NOVO) {
        try {
          const salvo = await salvarEquipamento({ ...novoEquip, cliente_id: cliente.id })
          idEquipamento = salvo.id
          // Se a OS falhar, o equipamento já cadastrado fica escolhido e não é criado de novo.
          setFicha({ ...cliente, equipamentos: [...doCliente, { ...salvo, ordens_servico: [] }] })
          setEquipamentoId(salvo.id)
          setNovoEquip(EQUIPAMENTO_VAZIO)
        } catch (erro) {
          if (erro.erros) setErrosEquip(erro.erros)
          else setErroGeral(erro.message)
          setEnviando(false)
          return
        }
      }
      const os = await abrirOrdem({
        equipamento_id: idEquipamento,
        problema_relatado: problema,
        retirada_agendada: new Date(`${retiradaData}T${retiradaHora}`).toISOString(),
      })
      recarregar()
      navegar(`/os/${os.id}`)
    } catch (erro) {
      if (erro.erros) setErros(erro.erros)
      else setErroGeral(erro.message)
      setEnviando(false)
    }
  }

  const nomeEquipResumo = equipamentoId === NOVO ? (novoEquip.modelo ? `${novoEquip.modelo} (novo)` : 'Novo equipamento') : equipamento?.modelo

  return (
    <Layout ativo="nova" trilha="Abrir OS">
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="pagina-titulo">Abrir ordem de serviço</div>

          <Etapa
            numero={1}
            titulo="Cliente"
            extra={
              <button className="btn btn-link" onClick={() => setNovoCliente(true)}>
                + Cadastrar novo cliente
              </button>
            }
          >
            {cliente ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-accent)',
                  background: 'var(--color-accent-900)',
                }}
              >
                <i className="ph-fill ph-check-circle" style={{ color: 'var(--color-accent-300)', fontSize: 18 }} />
                <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 500 }}>{cliente.nome}</div>
                  <div style={{ color: 'var(--color-neutral-400)', fontSize: 12.5 }}>
                    {telefone(cliente.telefone_whatsapp)} · {cliente.endereco}
                  </div>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ height: 28, fontWeight: 400, fontSize: 12.5 }}
                  onClick={() => {
                    setClienteId(null)
                    setFicha(null)
                    setEquipamentoId(null)
                  }}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <div className="input-icone">
                  <i className="ph ph-magnifying-glass" />
                  <input className="input" autoFocus placeholder="Buscar cliente por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
                {sugestoes.map((c) => (
                  <Opcao key={c.id} onClick={() => escolherCliente(c)} icone="ph-user" titulo={c.nome} detalhe={`${telefone(c.telefone_whatsapp)} · ${c.endereco}`} />
                ))}
                {termo && sugestoes.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Nenhum cliente encontrado. Cadastre um novo.</div>}
              </>
            )}
          </Etapa>

          <Etapa numero={2} titulo="Equipamento">
            {!cliente ? (
              <div className="muted" style={{ fontSize: 13 }}>
                {clienteId ? 'Carregando equipamentos…' : 'Escolha o cliente primeiro.'}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {doCliente.map((e) => {
                    const n = e.ordens_servico?.length ?? 0
                    const detalhe = [e.numero_serie && `Série ${e.numero_serie}`, n === 1 ? '1 OS anterior' : `${n} OS anteriores`].filter(Boolean).join(' · ')
                    return (
                      <Opcao
                        key={e.id}
                        marcada={equipamentoId === e.id}
                        onClick={() => setEquipamentoId(e.id)}
                        icone={iconeEquipamento(e.tipo)}
                        titulo={nomeEquipamento(e)}
                        detalhe={detalhe}
                      />
                    )
                  })}
                  <Opcao
                    marcada={equipamentoId === NOVO}
                    onClick={() => setEquipamentoId(NOVO)}
                    icone="ph-plus-circle"
                    titulo="Cadastrar novo equipamento"
                    detalhe={`fica vinculado a ${cliente.nome.split(' ')[0]}`}
                  />
                </div>
                {equipamentoId === NOVO && (
                  <div style={{ paddingTop: 4 }}>
                    <EquipamentoCampos valor={novoEquip} onChange={setNovoEquip} erros={errosEquip} />
                  </div>
                )}
              </>
            )}
          </Etapa>

          <Etapa numero={3} titulo="Problema e retirada">
            <div className="field">
              <label htmlFor="o-problema">Problema relatado pelo cliente *</label>
              <textarea
                id="o-problema"
                className={`input${erros.problema_relatado ? ' input-erro' : ''}`}
                value={problema}
                onChange={(e) => setProblema(e.target.value)}
              />
              <ErroCampo erros={erros.problema_relatado} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10 }}>
              <div className="field">
                <label htmlFor="o-data">Retirada combinada — data *</label>
                <input
                  id="o-data"
                  type="date"
                  className={`input${erros.retirada_agendada ? ' input-erro' : ''}`}
                  value={retiradaData}
                  onChange={(e) => setRetiradaData(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="o-hora">Horário *</label>
                <input
                  id="o-hora"
                  type="time"
                  className={`input${erros.retirada_agendada ? ' input-erro' : ''}`}
                  value={retiradaHora}
                  onChange={(e) => setRetiradaHora(e.target.value)}
                />
              </div>
              <div className="field">
                <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>Local da retirada</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 36, fontSize: 13, color: 'var(--color-neutral-300)' }}>
                  <i className="ph ph-map-pin" aria-hidden="true" />
                  {cliente?.endereco ?? 'Endereço do cadastro do cliente'}
                </div>
              </div>
            </div>
            <ErroCampo erros={erros.retirada_agendada} />
          </Etapa>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 52 }}>
          <div className="painel painel-pad">
            <div style={{ fontWeight: 500 }}>Resumo da OS</div>
            <LinhaResumo rotulo="Número">
              <span style={{ color: 'var(--color-neutral-400)' }}>gerado ao salvar</span>
            </LinhaResumo>
            <LinhaResumo rotulo="Data de abertura">{dataHora(agora)}</LinhaResumo>
            <LinhaResumo rotulo="Status inicial">
              <Pill status="aberta" />
            </LinhaResumo>
            <div style={{ height: 1, background: 'var(--color-neutral-800)' }} />
            <LinhaResumo rotulo="Cliente">{cliente?.nome ?? '—'}</LinhaResumo>
            <LinhaResumo rotulo="Equipamento">{(cliente && nomeEquipResumo) || '—'}</LinhaResumo>
            <LinhaResumo rotulo="Retirada">
              {retiradaData ? `${diaMes(`${retiradaData}T12:00`)}${retiradaHora ? ` às ${retiradaHora}` : ''}` : '—'}
            </LinhaResumo>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-500)', lineHeight: 1.45 }}>Número e data são gerados automaticamente ao salvar.</div>
          </div>
          <ErroCampo erros={erros.equipamento_id ?? (erroGeral ? [erroGeral] : null)} />
          <button className="btn btn-primary btn-block" style={{ height: 44 }} onClick={salvar} disabled={enviando}>
            <i className="ph ph-check" />
            {enviando ? 'Abrindo…' : 'Abrir OS'}
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => window.history.back()}>
            Cancelar
          </button>
        </div>
      </div>

      {novoCliente && (
        <ClienteDialog
          clientes={clientes}
          onSalvar={(dados) => salvarCliente(dados)}
          onFechar={() => setNovoCliente(false)}
          onSalvo={(salvo) => {
            recarregar()
            escolherCliente(salvo)
          }}
          onUsarExistente={escolherCliente}
        />
      )}
    </Layout>
  )
}
