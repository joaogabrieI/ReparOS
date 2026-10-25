import { useState } from 'react'
import Layout from '../components/Layout'
import Pill from '../components/Pill'
import { useDados } from '../data/contexto'
import { data, dataHora, dataIso, diaMesHora, linkWhatsApp, moeda, tempoNaEtapa, totalOrcamento } from '../data/formato'
import { mensagemLembreteAprovacao, mensagemOrcamento, mensagemPronto, mensagemRetirada, mensagemStatus } from '../data/mensagens'
import { estaParada } from '../data/regras'
import { corStatus, DIAS_PARADA, FLUXO, iconeEquipamento, infoStatus } from '../data/status'

const PERIGO = 'oklch(0.82 0.12 25)'

// Data escolhida num <input type="date"> com o horário atual, para registrar respostas e entregas.
function comHorarioAtual(dia) {
  const agora = new Date()
  const d = new Date(`${dia}T00:00`)
  d.setHours(agora.getHours(), agora.getMinutes())
  return d.toISOString()
}

function abrirWhatsApp(ordem, mensagem) {
  window.open(linkWhatsApp(ordem.cliente.telefone_whatsapp, mensagem), '_blank', 'noopener')
}

function Secao({ titulo, icone, extra, children }) {
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
        {icone && <i className={`ph ${icone}`} style={{ color: 'var(--color-neutral-400)', fontSize: 17 }} />}
        {titulo}
        {extra && <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{extra}</span>}
      </div>
      {children}
    </div>
  )
}

function Texto({ children, vazio = 'Não informado.' }) {
  return <div style={{ fontSize: 13.5, lineHeight: 1.5, color: children ? 'var(--color-neutral-200)' : 'var(--color-neutral-500)', whiteSpace: 'pre-wrap' }}>{children || vazio}</div>
}

function Previa({ texto }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'oklch(0.75 0.11 155 / 0.07)',
        border: '1px solid oklch(0.75 0.11 155 / 0.25)',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--color-neutral-200)',
        whiteSpace: 'pre-wrap',
      }}
    >
      {texto}
    </div>
  )
}

function BotaoWhatsApp({ children, ...props }) {
  return (
    <button className="btn btn-secondary" {...props}>
      <i className="ph ph-whatsapp-logo" style={{ color: 'var(--color-success)', fontSize: 17 }} />
      {children}
    </button>
  )
}

// Linha do tempo das 8 etapas do fluxo com a data em que cada uma começou (RF22, RF25).
function Etapas({ ordem }) {
  const recusada = ordem.status === 'orcamento_recusado'
  const atual = recusada ? FLUXO.indexOf('aguardando_aprovacao') : FLUXO.indexOf(ordem.status)
  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: `repeat(${FLUXO.length},minmax(0,1fr))`, padding: '14px 18px', gap: 6 }}>
      {FLUXO.map((s, i) => {
        const feito = i < atual || (i === atual && ordem.status === 'entregue')
        const corrente = i === atual && ordem.status !== 'entregue'
        const quando = [...ordem.historico].reverse().find((h) => h.status_novo === s)?.data_hora
        const cor = corrente ? (recusada ? PERIGO : corStatus(s)) : feito ? 'var(--color-accent-300)' : 'var(--color-neutral-700)'
        return (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ height: 3, borderRadius: 2, background: feito || corrente ? cor : 'var(--color-neutral-800)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: corrente ? 'var(--color-text)' : feito ? 'var(--color-neutral-300)' : 'var(--color-neutral-500)', fontWeight: corrente ? 500 : 400 }}>
              {feito && <i className="ph-fill ph-check-circle" style={{ color: 'var(--color-accent-300)' }} />}
              <span className="truncar">{corrente && recusada ? 'Orçamento recusado' : infoStatus(s).rotulo}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-neutral-500)' }}>{quando ? diaMesHora(quando) : '\u00a0'}</div>
          </div>
        )
      })}
    </div>
  )
}

function PainelRetirada({ ordem, atualizarOs }) {
  return (
    <Secao titulo="Registrar retirada" icone="ph-truck">
      <Texto>
        Retirada combinada para {dataHora(ordem.retirada_agendada)} em {ordem.retirada_local || ordem.cliente.endereco}.
      </Texto>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => atualizarOs(ordem.id, { data_retirada: new Date().toISOString() }, 'aguardando_diagnostico')}>
          <i className="ph ph-check" />
          Equipamento retirado
        </button>
        <BotaoWhatsApp onClick={() => abrirWhatsApp(ordem, mensagemRetirada(ordem))}>Confirmar horário</BotaoWhatsApp>
      </div>
    </Secao>
  )
}

function PainelDiagnostico({ ordem, atualizarOs }) {
  const [diagnostico, setDiagnostico] = useState(ordem.diagnostico)
  return (
    <Secao titulo="Registrar diagnóstico" icone="ph-stethoscope">
      <div className="field">
        <label htmlFor="d-diag">Diagnóstico técnico *</label>
        <textarea
          id="d-diag"
          className="input"
          style={{ minHeight: 110 }}
          placeholder="O que foi encontrado na análise do equipamento"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
        />
      </div>
      <div>
        <button className="btn btn-primary" disabled={!diagnostico.trim()} onClick={() => atualizarOs(ordem.id, { diagnostico: diagnostico.trim() }, 'diagnostico_realizado')}>
          <i className="ph ph-check" />
          Salvar diagnóstico
        </button>
      </div>
    </Secao>
  )
}

const ITEM_VAZIO = { tipo: 'servico', descricao: '', quantidade: 1, valor_unitario: 0 }

function PainelOrcamento({ ordem, atualizarOs }) {
  const [itens, setItens] = useState(ordem.orcamento?.itens ?? [{ ...ITEM_VAZIO }])
  const [prazo, setPrazo] = useState(ordem.orcamento?.prazo_entrega ?? 2)
  const orcamento = { itens, prazo_entrega: prazo }
  const total = totalOrcamento(orcamento)
  const valido = itens.some((i) => i.descricao.trim()) && total > 0 && prazo > 0

  const mudar = (i, campo) => (e) => setItens(itens.map((item, k) => (k === i ? { ...item, [campo]: e.target.value } : item)))

  function enviar() {
    const final = {
      itens: itens.filter((i) => i.descricao.trim()).map((i) => ({ ...i, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario) })),
      prazo_entrega: Number(prazo),
      situacao: 'pendente',
      data_envio: new Date().toISOString(),
      data_resposta: null,
    }
    abrirWhatsApp(ordem, mensagemOrcamento(ordem, final))
    atualizarOs(ordem.id, { orcamento: final }, 'orcamento_enviado')
  }

  const grid = '120px minmax(0,1fr) 70px 120px 110px 32px'
  return (
    <Secao titulo="Lançar orçamento" icone="ph-receipt">
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, fontSize: 12, color: 'var(--color-neutral-500)' }}>
        <span>Tipo</span>
        <span>Descrição</span>
        <span>Qtd.</span>
        <span>Valor unit.</span>
        <span style={{ textAlign: 'right' }}>Subtotal</span>
        <span />
      </div>
      {itens.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, alignItems: 'center' }}>
          <select className="input" value={item.tipo} onChange={mudar(i, 'tipo')} aria-label="Tipo do item">
            <option value="servico">Serviço</option>
            <option value="peca">Peça</option>
          </select>
          <input className="input" placeholder={item.tipo === 'peca' ? 'Ex.: Tela OLED' : 'Ex.: Troca de tela'} value={item.descricao} onChange={mudar(i, 'descricao')} aria-label="Descrição" />
          <input className="input" type="number" min="1" value={item.quantidade} onChange={mudar(i, 'quantidade')} aria-label="Quantidade" />
          <input className="input" type="number" min="0" step="0.01" value={item.valor_unitario} onChange={mudar(i, 'valor_unitario')} aria-label="Valor unitário" />
          <span style={{ textAlign: 'right', fontSize: 13.5 }}>{moeda(item.quantidade * item.valor_unitario)}</span>
          <button className="btn btn-ghost" style={{ padding: 0, width: 32 }} disabled={itens.length === 1} onClick={() => setItens(itens.filter((_, k) => k !== i))} aria-label="Remover item">
            <i className="ph ph-trash" />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => setItens([...itens, { ...ITEM_VAZIO, tipo: 'peca' }])}>
          <i className="ph ph-plus" />
          Adicionar item
        </button>
        <div className="field" style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <label htmlFor="o-prazo">Prazo (dias úteis)</label>
          <input id="o-prazo" className="input" type="number" min="1" style={{ width: 70 }} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
        <span style={{ fontSize: 16, fontWeight: 500 }}>Total {moeda(total)}</span>
      </div>
      {valido && <Previa texto={mensagemOrcamento(ordem, orcamento)} />}
      <div>
        <button className="btn btn-primary" disabled={!valido} onClick={enviar}>
          <i className="ph ph-whatsapp-logo" />
          Enviar orçamento pelo WhatsApp
        </button>
      </div>
    </Secao>
  )
}

function PainelAprovacao({ ordem, atualizarOs }) {
  const [dia, setDia] = useState(() => dataIso(new Date().toISOString()))
  const parada = estaParada(ordem)

  function responder(situacao) {
    const data_resposta = comHorarioAtual(dia)
    atualizarOs(ordem.id, { orcamento: { ...ordem.orcamento, situacao, data_resposta } }, situacao === 'aprovado' ? 'em_reparo' : 'orcamento_recusado')
  }

  return (
    <Secao titulo="Registrar resposta do cliente" icone="ph-chat-circle-text">
      {parada && (
        <div className="aviso aviso-perigo" style={{ borderRadius: 'var(--radius-md)' }}>
          <i className="ph ph-clock-countdown" style={{ color: PERIGO, fontSize: 18 }} />
          <span style={{ flex: 1 }}>
            Sem resposta há {tempoNaEtapa(ordem.diasNaEtapa)} <span className="muted">(mais de {DIAS_PARADA} dias)</span>
          </span>
          <BotaoWhatsApp onClick={() => abrirWhatsApp(ordem, mensagemLembreteAprovacao(ordem))}>Lembrar cliente</BotaoWhatsApp>
        </div>
      )}
      <Texto>
        Orçamento de {moeda(totalOrcamento(ordem.orcamento))} enviado em {dataHora(ordem.orcamento?.data_envio)}.
      </Texto>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div className="field" style={{ width: 170 }}>
          <label htmlFor="a-dia">Data da resposta *</label>
          <input id="a-dia" type="date" className="input" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={!dia} onClick={() => responder('aprovado')}>
          <i className="ph ph-thumbs-up" />
          Cliente aprovou
        </button>
        <button className="btn btn-secondary" disabled={!dia} onClick={() => responder('recusado')}>
          <i className="ph ph-thumbs-down" />
          Cliente recusou
        </button>
        {ordem.status === 'orcamento_enviado' && (
          <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => atualizarOs(ordem.id, {}, 'aguardando_aprovacao')}>
            Marcar como aguardando aprovação
          </button>
        )}
      </div>
    </Secao>
  )
}

function PainelReparo({ ordem, atualizarOs }) {
  const [servico, setServico] = useState(ordem.servico_executado)
  const [pecas, setPecas] = useState(ordem.pecas_trocadas)
  return (
    <Secao titulo="Registrar reparo" icone="ph-wrench">
      <div className="field">
        <label htmlFor="r-servico">Serviço executado *</label>
        <textarea id="r-servico" className="input" value={servico} onChange={(e) => setServico(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="r-pecas">Peças trocadas</label>
        <textarea id="r-pecas" className="input" placeholder="Peça e quantidade, uma por linha" value={pecas} onChange={(e) => setPecas(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary"
          disabled={!servico.trim()}
          onClick={() => atualizarOs(ordem.id, { servico_executado: servico.trim(), pecas_trocadas: pecas.trim() }, 'pronto_para_retirada')}
        >
          <i className="ph ph-check" />
          Marcar como pronto
        </button>
        <button className="btn btn-secondary" onClick={() => atualizarOs(ordem.id, { servico_executado: servico.trim(), pecas_trocadas: pecas.trim() })}>
          Salvar rascunho
        </button>
      </div>
    </Secao>
  )
}

function PainelEntrega({ ordem, atualizarOs }) {
  const [dia, setDia] = useState(() => dataIso(new Date().toISOString()))
  const pronto = ordem.status === 'pronto_para_retirada'
  return (
    <Secao titulo={pronto ? 'Avisar cliente e registrar entrega' : 'Registrar devolução do equipamento'} icone="ph-package">
      {pronto && (
        <>
          <Previa texto={mensagemPronto(ordem)} />
          <div>
            <BotaoWhatsApp onClick={() => abrirWhatsApp(ordem, mensagemPronto(ordem))}>Avisar pelo WhatsApp</BotaoWhatsApp>
          </div>
          <div style={{ height: 1, background: 'var(--color-neutral-800)' }} />
        </>
      )}
      {!pronto && <Texto>O orçamento foi recusado em {data(ordem.orcamento?.data_resposta)}. Registre quando o equipamento for devolvido.</Texto>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div className="field" style={{ width: 170 }}>
          <label htmlFor="e-dia">Data da entrega *</label>
          <input id="e-dia" type="date" className="input" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={!dia} onClick={() => atualizarOs(ordem.id, { data_entrega: comHorarioAtual(dia) }, 'entregue')}>
          <i className="ph ph-check" />
          Registrar entrega
        </button>
      </div>
    </Secao>
  )
}

const PAINEIS = {
  aberta: PainelRetirada,
  aguardando_diagnostico: PainelDiagnostico,
  diagnostico_realizado: PainelOrcamento,
  orcamento_enviado: PainelAprovacao,
  aguardando_aprovacao: PainelAprovacao,
  em_reparo: PainelReparo,
  pronto_para_retirada: PainelEntrega,
  orcamento_recusado: PainelEntrega,
}

function ResumoOrcamento({ orcamento }) {
  const situacao = { pendente: 'Aguardando resposta', aprovado: 'Aprovado', recusado: 'Recusado' }[orcamento.situacao]
  return (
    <Secao titulo="Orçamento" icone="ph-receipt" extra={<span className="muted" style={{ fontSize: 13 }}>{situacao}</span>}>
      {orcamento.itens.map((i, k) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
          <span style={{ color: 'var(--color-neutral-300)' }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {i.tipo === 'peca' ? 'Peça' : 'Serviço'} ·{' '}
            </span>
            {i.descricao}
            {i.quantidade > 1 && ` (${i.quantidade}x)`}
          </span>
          <span>{moeda(i.quantidade * i.valor_unitario)}</span>
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--color-neutral-800)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
        <span className="muted">
          Prazo de {orcamento.prazo_entrega} {orcamento.prazo_entrega === 1 ? 'dia útil' : 'dias úteis'} · enviado em {data(orcamento.data_envio)}
          {orcamento.data_resposta && ` · respondido em ${data(orcamento.data_resposta)}`}
        </span>
        <span style={{ fontWeight: 500 }}>{moeda(totalOrcamento(orcamento))}</span>
      </div>
    </Secao>
  )
}

function Dado({ rotulo, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
      <span style={{ color: 'var(--color-neutral-400)' }}>{rotulo}</span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  )
}

// Detalhe da OS com a ação da etapa atual (RF09 a RF20, RF22, RF24, RF25).
export default function DetalheOs({ id }) {
  const { ordens, atualizarOs } = useDados()
  const ordem = ordens.find((o) => o.id === id)

  if (!ordem) {
    return (
      <Layout ativo="os" trilha="OS">
        <div style={{ padding: 28, color: 'var(--color-neutral-400)' }}>
          OS não encontrada. <a href="#/os">Voltar para a busca</a>
        </div>
      </Layout>
    )
  }

  const Painel = PAINEIS[ordem.status]
  const { cliente, equipamento } = ordem
  const parada = estaParada(ordem)

  return (
    <Layout
      ativo={ordem.status === 'entregue' ? 'os' : 'painel'}
      trilha={
        <>
          <a href={ordem.status === 'entregue' ? '#/os' : '#/'} style={{ color: 'inherit' }}>
            {ordem.status === 'entregue' ? 'Buscar OS' : 'OS pendentes'}
          </a>{' '}
          / <span style={{ color: 'var(--color-text)' }}>OS {ordem.numero}</span>
        </>
      }
      acoes={<BotaoWhatsApp onClick={() => abrirWhatsApp(ordem, mensagemStatus(ordem))}>Enviar status</BotaoWhatsApp>}
    >
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="pagina-titulo">OS {ordem.numero}</span>
              <Pill status={ordem.status} />
              {parada && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: PERIGO, fontWeight: 500 }}>
                  <i className="ph ph-warning" />
                  Parada há {tempoNaEtapa(ordem.diasNaEtapa)}
                </span>
              )}
            </div>
            <div className="pagina-subtitulo">
              {cliente.nome} · {equipamento.modelo} · aberta em {dataHora(ordem.data_abertura)}
            </div>
          </div>
        </div>

        <Etapas ordem={ordem} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {Painel && <Painel key={ordem.status} ordem={ordem} atualizarOs={atualizarOs} />}

            <Secao titulo="Problema relatado" icone="ph-chat-text">
              <Texto>{ordem.problema_relatado}</Texto>
            </Secao>
            {ordem.diagnostico && ordem.status !== 'aguardando_diagnostico' && (
              <Secao titulo="Diagnóstico" icone="ph-stethoscope">
                <Texto>{ordem.diagnostico}</Texto>
              </Secao>
            )}
            {ordem.orcamento && ordem.status !== 'diagnostico_realizado' && <ResumoOrcamento orcamento={ordem.orcamento} />}
            {['pronto_para_retirada', 'entregue'].includes(ordem.status) && ordem.servico_executado && (
              <Secao titulo="Reparo" icone="ph-wrench">
                <Dado rotulo="Serviço executado">{ordem.servico_executado}</Dado>
                <Dado rotulo="Peças trocadas">{ordem.pecas_trocadas || 'Nenhuma'}</Dado>
              </Secao>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Secao titulo="Cliente" icone="ph-user" extra={<a href={`#/clientes/${cliente.id}`} style={{ fontSize: 13 }}>Ver ficha</a>}>
              <div style={{ fontWeight: 500 }}>{cliente.nome}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: 'var(--color-neutral-400)' }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <i className="ph ph-whatsapp-logo" />
                  {cliente.telefone_whatsapp}
                </span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <i className="ph ph-map-pin" style={{ marginTop: 2 }} />
                  {cliente.endereco}
                </span>
              </div>
            </Secao>
            <Secao titulo="Equipamento" icone={iconeEquipamento(equipamento.tipo)}>
              <Dado rotulo="Tipo">{equipamento.tipo}</Dado>
              <Dado rotulo="Marca e modelo">
                {equipamento.marca} {equipamento.modelo}
              </Dado>
              <Dado rotulo="Nº de série">{equipamento.numero_serie || '—'}</Dado>
            </Secao>
            <Secao titulo="Retirada e entrega" icone="ph-truck">
              <Dado rotulo="Combinada">{dataHora(ordem.retirada_agendada)}</Dado>
              <Dado rotulo="Retirado em">{dataHora(ordem.data_retirada)}</Dado>
              <Dado rotulo="Entregue em">{dataHora(ordem.data_entrega)}</Dado>
            </Secao>
            <Secao titulo="Histórico de status" icone="ph-clock-counter-clockwise">
              {[...ordem.historico].reverse().map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, marginTop: 5, flex: 'none', background: corStatus(h.status_novo) }} />
                  <span style={{ flex: 1 }}>{infoStatus(h.status_novo).rotulo}</span>
                  <span className="muted">{diaMesHora(h.data_hora)}</span>
                </div>
              ))}
            </Secao>
          </div>
        </div>
      </div>
    </Layout>
  )
}
