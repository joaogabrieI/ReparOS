import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { useDados } from '../data/contexto'
import { diaMes, hora, tempoNaEtapa } from '../data/formato'
import { estaParada } from '../data/regras'
import { corStatus, DIAS_PARADA, iconeEquipamento, infoStatus, PENDENTES } from '../data/status'

const PERIGO = 'oklch(0.84 0.12 25)'
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function saudacao(agora) {
  const h = agora.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function mesmoDia(a, b) {
  return a.toDateString() === b.toDateString()
}

function quandoRelativo(iso, agora) {
  const d = new Date(iso)
  if (mesmoDia(d, agora)) return hora(iso)
  const ontem = new Date(agora)
  ontem.setDate(ontem.getDate() - 1)
  return mesmoDia(d, ontem) ? 'ontem' : diaMes(iso)
}

// Como cada compromisso aparece na agenda: a retirada busca o equipamento no cliente (OS aberta) e a
// entrega leva o equipamento de volta ao endereço de entrega da OS.
const TIPOS_AGENDA = {
  retirada: { rotulo: 'Retirada', icone: 'ph-arrow-circle-down', matiz: 289 },
  entrega: { rotulo: 'Entrega', icone: 'ph-truck', matiz: 155 },
}

function TipoAgenda({ tipo }) {
  const t = TIPOS_AGENDA[tipo]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 24,
        padding: '0 9px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        color: `oklch(0.84 0.1 ${t.matiz})`,
        background: `oklch(0.82 0.1 ${t.matiz} / 0.1)`,
        border: `1px solid oklch(0.82 0.1 ${t.matiz} / 0.32)`,
      }}
    >
      <i className={`ph ${t.icone}`} aria-hidden="true" />
      {t.rotulo}
    </span>
  )
}

function plural(n, singular, pluralTexto) {
  return n === 1 ? `1 ${singular}` : `${n} ${pluralTexto}`
}

// Ação sugerida quando a OS está parada esperando o cliente.
function acaoSugerida(ordem) {
  if (estaParada(ordem) && ['orcamento_enviado', 'aguardando_aprovacao'].includes(ordem.status)) return 'Cobrar resposta'
  if (estaParada(ordem) && ordem.status === 'pronto_para_retirada') return 'Reenviar aviso'
  return infoStatus(ordem.status).proximaAcao
}

function Indicador({ rotulo, valor, detalhe, icone, matiz, destaque }) {
  return (
    <div className="painel painel-pad" style={{ gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>{rotulo}</span>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 17,
            color: matiz == null ? 'var(--color-accent-300)' : `oklch(0.84 0.1 ${matiz})`,
            background: matiz == null ? 'var(--color-accent-900)' : `oklch(0.82 0.1 ${matiz} / 0.12)`,
          }}
        >
          <i className={`ph ${icone}`} />
        </span>
      </div>
      <span style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, color: destaque ? PERIGO : undefined }}>{valor}</span>
      <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{detalhe}</span>
    </div>
  )
}

// Tela inicial: o que precisa de ação, agenda de retiradas e entregas, pendentes por status e atividade recente (RF08, RF21, RF22, RF24).
// Tudo vem do painel da API (/api/painel), que já conta e escolhe as OS; a retirada usa o endereço do cadastro do
// cliente e a entrega, o endereço de entrega da OS. Ao abrir a tela, o painel é atualizado.
export default function Inicio() {
  const { painel, usuario, recarregar, erro } = useDados()
  const [agora] = useState(() => new Date())
  const [busca, setBusca] = useState('')

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const p = painel ?? { pendentes: 0, por_status: {}, paradas: 0, parada_mais_antiga_dias: 0, prontas: 0, pronta_desde: null, abertas_hoje: 0, entregues_mes: 0, entregues_mes_anterior: 0, agenda: [], acoes: [], atividade: [] }

  // Agenda de hoje e amanhã: retiradas combinadas (OS aberta, equipamento ainda com o cliente) e entregas
  // no endereço; entrega marcada com o reparo ainda em andamento avisa em vez de sugerir registrar a entrega.
  const agenda = p.agenda.map((c) => ({
    ...c,
    acao: c.tipo === 'retirada' ? 'Registrar retirada' : c.pronta ? 'Registrar entrega' : 'OS ainda não pronta',
  }))
  const agendaHoje = agenda.filter((c) => mesmoDia(new Date(c.quando), agora))
  const retiradasHoje = agendaHoje.filter((c) => c.tipo === 'retirada').length
  const entregasHoje = agendaHoje.filter((c) => c.tipo === 'entrega').length

  const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const entregues = p.entregues_mes
  const diferenca = entregues - p.entregues_mes_anterior

  const acoes = p.acoes
  const distribuicao = PENDENTES.map((status) => ({ status, n: p.por_status[status] ?? 0 })).filter((d) => d.n > 0)

  // Última mudança de status de cada OS.
  const atividade = p.atividade.map((o) => ({ status_novo: o.status, data_hora: o.data_status, ordem: o }))

  const resumoDia = [
    plural(retiradasHoje, 'retirada', 'retiradas') + (entregasHoje ? ` e ${plural(entregasHoje, 'entrega', 'entregas')}` : '') + ' hoje',
    plural(p.paradas, 'OS parada', 'OS paradas'),
  ].join(', ')

  function buscar(e) {
    e.preventDefault()
    navegar(`/pendentes?busca=${encodeURIComponent(busca)}`)
  }

  return (
    <Layout
      ativo="inicio"
      trilha="Início"
      acoes={
        <>
          <form className="input-icone" style={{ width: 340 }} onSubmit={buscar}>
            <i className="ph ph-magnifying-glass" />
            <input className="input" style={{ minHeight: 34 }} placeholder="Nº da OS, cliente ou equipamento" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </form>
          <a className="btn btn-primary" href="#/os/nova">
            <i className="ph ph-plus" />
            Abrir OS
          </a>
        </>
      }
    >
      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 className="pagina-titulo">
            {saudacao(agora)}
            {usuario && `, ${usuario.nome.split(' ')[0]}`}
          </h1>
          <div className="pagina-subtitulo">
            {DIAS[agora.getDay()]}, {agora.getDate()} de {MESES[agora.getMonth()]} de {agora.getFullYear()} · {resumoDia}
          </div>
        </div>

        {erro && (
          <div className="erro-campo" role="alert" style={{ marginTop: 0 }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14 }}>
          <Indicador
            rotulo="OS pendentes"
            valor={p.pendentes}
            detalhe={p.abertas_hoje === 1 ? '1 aberta hoje' : `${p.abertas_hoje} abertas hoje`}
            icone="ph-clipboard-text"
          />
          <Indicador
            rotulo={`Paradas há +${DIAS_PARADA} dias`}
            valor={p.paradas}
            detalhe={p.paradas ? `mais antiga: ${tempoNaEtapa(p.parada_mais_antiga_dias)}` : 'nenhuma OS parada'}
            icone="ph-clock-countdown"
            matiz={25}
            destaque={p.paradas > 0}
          />
          <Indicador
            rotulo="Prontas para retirada"
            valor={p.prontas}
            detalhe={p.prontas ? `pronta desde ${diaMes(p.pronta_desde)}` : 'nenhuma aguardando'}
            icone="ph-check-circle"
            matiz={155}
          />
          <Indicador
            rotulo={`Entregues em ${MESES[agora.getMonth()]}`}
            valor={entregues}
            detalhe={`${diferenca >= 0 ? '+' : ''}${diferenca} vs. ${MESES[mesAnterior.getMonth()]}`}
            icone="ph-handshake"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div className="painel tabela">
              <div className="painel-cabecalho">
                <i className="ph ph-lightning" style={{ color: 'var(--color-accent-400)' }} />
                <span style={{ fontWeight: 500, flex: 1 }}>Precisa da sua ação</span>
                <a href="#/pendentes" style={{ fontSize: 13 }}>
                  Ver todas as pendentes →
                </a>
              </div>
              {acoes.length === 0 && (
                <div style={{ padding: 18, color: 'var(--color-neutral-500)' }} role="status">
                  {painel ? 'Nada pendente por enquanto.' : 'Carregando…'}
                </div>
              )}
              {acoes.map((o) => {
                const parada = estaParada(o)
                return (
                  <button
                    key={o.id}
                    className="tabela-linha"
                    onClick={() => navegar(`/os/${o.id}`)}
                    style={{
                      gridTemplateColumns: '150px minmax(0,1fr) 200px 84px 150px',
                      background: parada ? 'oklch(0.8 0.12 25 / 0.06)' : undefined,
                      boxShadow: parada ? 'inset 2px 0 0 oklch(0.75 0.13 25)' : 'none',
                    }}
                  >
                    <span className="mono">{o.numero}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                      <span style={{ fontWeight: 500 }}>{o.cliente?.nome}</span>
                      <span className="truncar" style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>
                        {o.equipamento?.modelo}
                      </span>
                    </span>
                    <span>
                      <Pill status={o.status} rotulo={o.status_rotulo} />
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12.5,
                        whiteSpace: 'nowrap',
                        color: parada ? PERIGO : 'var(--color-neutral-500)',
                        fontWeight: parada ? 500 : 400,
                      }}
                    >
                      <i className={`ph ${parada ? 'ph-warning' : 'ph-clock'}`} />
                      {tempoNaEtapa(o.diasNaEtapa)}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--color-accent-300)' }}>{acaoSugerida(o)} →</span>
                  </button>
                )
              })}
            </div>

            <section className="painel tabela" aria-labelledby="agenda-titulo">
              <div className="painel-cabecalho">
                <i className="ph ph-calendar-check" style={{ color: 'var(--color-accent-400)' }} aria-hidden="true" />
                <h2 id="agenda-titulo" style={{ fontWeight: 500, flex: 1, fontSize: 'inherit', margin: 0 }}>
                  Retiradas e entregas combinadas
                </h2>
                <span style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>hoje e amanhã</span>
              </div>
              {agenda.length === 0 && <div style={{ padding: 18, color: 'var(--color-neutral-500)' }}>Nenhuma retirada ou entrega combinada para hoje ou amanhã.</div>}
              {agenda.map(({ tipo, quando, endereco, acao, pronta, ordem: o }) => (
                <button
                  key={`${tipo}-${o.id}`}
                  className="tabela-linha"
                  onClick={() => navegar(`/os/${o.id}`)}
                  style={{ gridTemplateColumns: '64px 96px minmax(0,1fr) minmax(0,1.1fr) 150px' }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                    <span style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{hora(quando)}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{mesmoDia(new Date(quando), agora) ? 'Hoje' : 'Amanhã'}</span>
                  </span>
                  <span>
                    <TipoAgenda tipo={tipo} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{o.cliente?.nome}</span>
                    <span className="truncar" style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>
                      <i className={`ph ${iconeEquipamento(o.equipamento?.tipo)}`} aria-hidden="true" /> {o.equipamento?.modelo} · {o.numero}
                    </span>
                  </span>
                  <span className="truncar" style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--color-neutral-400)', fontSize: 13 }}>
                    <i className="ph ph-map-pin" aria-hidden="true" />
                    <span className="truncar">{endereco || 'Endereço não informado'}</span>
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      fontSize: 13,
                      color: pronta ? 'var(--color-accent-300)' : PERIGO,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {!pronta && <i className="ph ph-warning" aria-hidden="true" />}
                    {acao} {pronta && '→'}
                  </span>
                </button>
              ))}
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="painel painel-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500 }}>Pendentes por status</span>
                <span style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>{p.pendentes} OS</span>
              </div>
              <div style={{ display: 'flex', gap: 3, height: 8, borderRadius: 4, overflow: 'hidden' }}>
                {distribuicao.map((d) => (
                  <div key={d.status} style={{ flex: d.n, background: corStatus(d.status) }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {distribuicao.map((d) => (
                  <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-neutral-400)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: corStatus(d.status) }} />
                    <span style={{ flex: 1 }}>{infoStatus(d.status).rotulo}</span>
                    <span style={{ color: 'var(--color-text)' }}>{d.n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="painel painel-pad" style={{ gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>Atividade recente</span>
                <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>todas as OS</span>
              </div>
              {atividade.map((a, i) => (
                <a
                  key={i}
                  href={`#/os/${a.ordem.id}`}
                  style={{ display: 'flex', gap: 12, padding: '8px 0', borderTop: '1px solid var(--color-neutral-900)', color: 'inherit' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', marginTop: 6, background: corStatus(a.status_novo) }} />
                  <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>
                        {a.ordem.cliente?.nome} · {a.ordem.numero}
                      </span>
                      <span style={{ color: 'var(--color-neutral-500)', fontSize: 12 }}>{quandoRelativo(a.data_hora, agora)}</span>
                    </div>
                    <div style={{ color: 'var(--color-neutral-500)' }}>{infoStatus(a.status_novo).rotulo}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
