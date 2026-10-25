import { useRef, useState } from 'react'
import Layout from '../components/Layout'
import { navegar } from '../components/roteador'
import { useDados } from '../data/contexto'
import { data, dataHora, dataIso, diaMesHora, hora, inicial, linkWhatsApp, moeda, nomeEquipamento, tempoNaEtapa, totalOrcamento } from '../data/formato'
import { mensagemLembreteAprovacao, mensagemOrcamento, mensagemPronto, mensagemRetirada, mensagemStatus } from '../data/mensagens'
import { estaParada, pecasDoOrcamento, proximoStatus } from '../data/regras'
import { corStatus, FLUXO, iconeEquipamento, infoStatus } from '../data/status'

const PERIGO = 'oklch(0.84 0.11 25)'

// Botão do cabeçalho e próxima etapa permitida em cada status.
const PROXIMO = {
  aberta: { rotulo: 'Registrar retirada', icone: 'ph-truck' },
  aguardando_diagnostico: { rotulo: 'Registrar diagnóstico', icone: 'ph-stethoscope' },
  diagnostico_realizado: { rotulo: 'Lançar orçamento', icone: 'ph-receipt', etapa: 'Orçamento enviado (ao enviar a mensagem)' },
  orcamento_enviado: { rotulo: 'Registrar resposta', icone: 'ph-check-square', etapa: 'Em reparo (se aprovado)' },
  aguardando_aprovacao: { rotulo: 'Registrar resposta', icone: 'ph-check-square', etapa: 'Em reparo (se aprovado)' },
  em_reparo: { rotulo: 'Marcar como pronto', icone: 'ph-check-circle' },
  pronto_para_retirada: { rotulo: 'Registrar entrega', icone: 'ph-handshake' },
  orcamento_recusado: { rotulo: 'Registrar entrega', icone: 'ph-handshake', etapa: 'Entregue (devolução sem reparo)' },
}

function agoraIso() {
  return new Date().toISOString()
}

function abrirWhatsApp(ordem, mensagem) {
  window.open(linkWhatsApp(ordem.cliente.telefone_whatsapp, mensagem), '_blank', 'noopener')
}

function PillGrande({ status }) {
  const h = infoStatus(status).matiz
  const estilo =
    h == null
      ? { color: 'var(--color-neutral-300)', background: 'var(--color-neutral-900)', border: '1px solid var(--color-neutral-800)' }
      : { color: `oklch(0.84 0.1 ${h})`, background: `oklch(0.82 0.1 ${h} / 0.12)`, border: `1px solid oklch(0.82 0.1 ${h} / 0.4)` }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 12px', borderRadius: 999, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', ...estilo }}>
      <i className="ph-fill ph-circle" style={{ fontSize: 8 }} />
      {infoStatus(status).rotulo}
    </span>
  )
}

function SeloParada({ dias }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        padding: '3px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        color: PERIGO,
        background: 'oklch(0.8 0.12 25 / 0.12)',
        border: '1px solid oklch(0.8 0.12 25 / 0.35)',
      }}
    >
      <i className="ph ph-clock-countdown" />
      Nesta etapa há {tempoNaEtapa(dias)}
    </span>
  )
}

function TagItem({ tipo }) {
  const peca = tipo === 'peca'
  return (
    <span
      style={{
        justifySelf: 'start',
        fontSize: 11.5,
        padding: '2px 8px',
        borderRadius: 6,
        color: peca ? 'oklch(0.84 0.1 55)' : 'var(--color-accent-200)',
        background: peca ? 'oklch(0.82 0.1 55 / 0.12)' : 'var(--color-accent-900)',
      }}
    >
      {peca ? 'Peça' : 'Serviço'}
    </span>
  )
}

// As 8 etapas do fluxo: concluídas, atual e bloqueadas (RF22).
function Etapas({ ordem }) {
  const recusada = ordem.status === 'orcamento_recusado'
  const atual = recusada ? FLUXO.indexOf('aguardando_aprovacao') : FLUXO.indexOf(ordem.status)
  const encerrada = ordem.status === 'entregue'
  const proxima = PROXIMO[ordem.status]?.etapa ?? infoStatus(proximoStatus(ordem.status) ?? 'entregue').rotulo

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {FLUXO.map((s, i) => {
          const feita = i < atual || encerrada
          const corrente = i === atual && !encerrada
          const h = recusada && corrente ? 25 : infoStatus(s).matiz
          return (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: feita ? 'var(--color-accent-600)' : corrente ? `oklch(0.78 0.11 ${h})` : 'var(--color-neutral-800)',
                  boxShadow: corrente ? `0 0 10px oklch(0.7 0.11 ${h} / 0.6)` : 'none',
                }}
              />
              <span
                className="truncar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  color: corrente ? 'var(--color-text)' : feita ? 'var(--color-neutral-400)' : 'var(--color-neutral-600)',
                  fontWeight: corrente ? 500 : 400,
                }}
              >
                <i className={`ph ${feita ? 'ph-check' : corrente ? 'ph-circle' : 'ph-lock-simple'}`} style={{ fontSize: 12 }} />
                {recusada && corrente ? 'Orçamento recusado' : infoStatus(s).rotulo}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-neutral-500)' }}>
        <i className="ph ph-lock-simple" />
        {encerrada ? (
          'OS encerrada. Agora ela só pode ser consultada.'
        ) : (
          <span>
            Próxima etapa permitida: <span style={{ color: 'var(--color-neutral-200)' }}>{proxima}</span>. As etapas seguem a sequência do fluxo e não podem ser puladas.
          </span>
        )}
      </div>
    </div>
  )
}

function Cabecalho({ titulo, sub, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div className="painel-titulo">{titulo}</div>
        {sub && <div className="painel-sub">{sub}</div>}
      </div>
      {extra}
    </div>
  )
}

function PainelRetirada({ ordem, concluir, refAcao }) {
  return (
    <div className="painel-acao" ref={refAcao} tabIndex={-1}>
      <Cabecalho
        titulo="Registrar retirada"
        sub={
          <>
            Ao confirmar, o status muda para <span style={{ color: 'var(--color-neutral-200)' }}>Aguardando diagnóstico</span>
          </>
        }
      />
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-neutral-300)' }}>
        Retirada combinada para {dataHora(ordem.retirada_agendada)} em {ordem.retirada_local || ordem.cliente.endereco}.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => abrirWhatsApp(ordem, mensagemRetirada(ordem))}>
          <i className="ph ph-whatsapp-logo" />
          Confirmar horário
        </button>
        <button className="btn btn-primary" onClick={concluir}>
          <i className="ph ph-check" />
          Equipamento retirado
        </button>
      </div>
    </div>
  )
}

function PainelDiagnostico({ ordem, concluir, refAcao }) {
  const [causa, setCausa] = useState(ordem.diagnostico)
  const [servico, setServico] = useState(ordem.servico_necessario)
  return (
    <div className="painel-acao" ref={refAcao} tabIndex={-1}>
      <Cabecalho
        titulo="Registrar diagnóstico"
        sub={
          <>
            Ao salvar, o status muda para <span style={{ color: 'var(--color-neutral-200)' }}>Diagnóstico realizado</span>
          </>
        }
      />
      <div className="field">
        <label htmlFor="d-causa">Causa do defeito *</label>
        <textarea id="d-causa" className="input" value={causa} onChange={(e) => setCausa(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="d-servico">O que precisa ser feito *</label>
        <textarea id="d-servico" className="input" value={servico} onChange={(e) => setServico(e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setCausa(ordem.diagnostico)
            setServico(ordem.servico_necessario)
          }}
        >
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={concluir}
        >
          <i className="ph ph-check" />
          Salvar diagnóstico
        </button>
      </div>
    </div>
  )
}

const GRID_ITENS = '90px minmax(0,1fr) 70px 120px 120px 24px'

// Data final do prazo, contando só dias úteis.
function prazoAte(dias) {
  const d = new Date()
  let uteis = 0
  while (uteis < dias) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) uteis++
  }
  return d.toISOString()
}

function PainelOrcamento({ itens, setItens, prazo, setPrazo, refAcao }) {
  const total = totalOrcamento({ itens })
  const mudar = (i, campo) => (e) => setItens(itens.map((item, k) => (k === i ? { ...item, [campo]: e.target.value } : item)))
  const adicionar = (tipo) => setItens([...itens, { tipo, descricao: '', quantidade: 1, valor_unitario: 0 }])

  return (
    <div className="painel-acao" style={{ padding: 0, gap: 0, overflow: 'hidden' }} ref={refAcao} tabIndex={-1}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--color-neutral-800)' }}>
        <div style={{ flex: 1 }}>
          <div className="painel-titulo">Lançar orçamento</div>
          <div className="painel-sub">Itens de serviço e peças · o total é calculado automaticamente</div>
        </div>
        <button className="btn btn-ghost" onClick={() => adicionar('servico')}>
          <i className="ph ph-wrench" />+ Serviço
        </button>
        <button className="btn btn-ghost" onClick={() => adicionar('peca')}>
          <i className="ph ph-package" />+ Peça
        </button>
      </div>
      <div className="tabela-cabecalho" style={{ gridTemplateColumns: GRID_ITENS, padding: '9px 18px', borderBottomColor: 'var(--color-neutral-900)' }}>
        <span>Tipo</span>
        <span>Descrição</span>
        <span>Qtd</span>
        <span>Valor unit.</span>
        <span style={{ textAlign: 'right' }}>Total</span>
        <span />
      </div>
      {itens.length === 0 && <div style={{ padding: '14px 18px', fontSize: 13.5, color: 'var(--color-neutral-500)' }}>Adicione um serviço ou uma peça.</div>}
      {itens.map((item, i) => (
        <div key={i} className="tabela-linha" style={{ gridTemplateColumns: GRID_ITENS, padding: '8px 18px', borderBottom: '1px solid var(--color-neutral-900)' }}>
          <TagItem tipo={item.tipo} />
          <input
            className="input"
            style={{ minHeight: 32 }}
            placeholder={item.tipo === 'peca' ? 'Ex.: SSD 480GB' : 'Ex.: Limpeza interna'}
            value={item.descricao}
            onChange={mudar(i, 'descricao')}
            aria-label="Descrição"
          />
          <input className="input" style={{ minHeight: 32 }} type="number" min="1" value={item.quantidade} onChange={mudar(i, 'quantidade')} aria-label="Quantidade" />
          <input className="input" style={{ minHeight: 32 }} type="number" min="0" step="0.01" value={item.valor_unitario} onChange={mudar(i, 'valor_unitario')} aria-label="Valor unitário" />
          <span style={{ textAlign: 'right', fontWeight: 500 }}>{moeda(item.quantidade * item.valor_unitario)}</span>
          <button className="btn btn-icon" style={{ width: 24, height: 24, color: 'var(--color-neutral-600)' }} onClick={() => setItens(itens.filter((_, k) => k !== i))} aria-label="Remover item">
            <i className="ph ph-x" />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '14px 18px' }}>
        <div className="field" style={{ width: 240 }}>
          <label htmlFor="o-prazo">Prazo de entrega *</label>
          <div style={{ position: 'relative' }}>
            <input id="o-prazo" className="input" type="number" min="1" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={{ paddingRight: 130 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-neutral-500)' }}>
              dias úteis{Number(prazo) > 0 && ` · até ${data(prazoAte(Number(prazo))).slice(0, 5)}`}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>Valor total calculado</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{moeda(total)}</div>
        </div>
      </div>
    </div>
  )
}

function PainelResposta({ ordem, onResponder, refAcao }) {
  const { orcamento } = ordem
  const parada = estaParada(ordem)
  return (
    <div className="painel-acao" ref={refAcao} tabIndex={-1}>
      <Cabecalho
        titulo="Resposta do cliente"
        sub={`Orçamento enviado em ${diaMesHora(orcamento.data_envio).replace(' ', ' às ')} pelo WhatsApp`}
        extra={ordem.diasNaEtapa >= 3 ? <SeloParada dias={ordem.diasNaEtapa} /> : null}
      />
      {orcamento.itens.map((i, k) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
          <span style={{ color: 'var(--color-neutral-400)' }}>
            {i.tipo === 'peca' ? 'Peça' : 'Serviço'} · {i.descricao}
            {i.quantidade > 1 && ` ×${i.quantidade}`}
          </span>
          <span>{moeda(i.quantidade * i.valor_unitario)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTop: '1px solid var(--color-neutral-800)' }}>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
          Prazo: {orcamento.prazo_entrega} {orcamento.prazo_entrega === 1 ? 'dia útil' : 'dias úteis'} após aprovação
        </span>
        <span style={{ fontSize: 22, fontWeight: 500 }}>{moeda(totalOrcamento(orcamento))}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {parada && (
          <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => abrirWhatsApp(ordem, mensagemLembreteAprovacao(ordem))}>
            <i className="ph ph-whatsapp-logo" />
            Cobrar resposta
          </button>
        )}
        <button className="btn btn-secondary btn-perigo" onClick={() => onResponder('recusado')}>
          <i className="ph ph-x" />
          Registrar recusa
        </button>
        <button className="btn btn-primary" onClick={() => onResponder('aprovado')}>
          <i className="ph ph-check" />
          Registrar aprovação
        </button>
      </div>
    </div>
  )
}

function PainelReparo({ ordem, concluir, refAcao }) {
  const [servico, setServico] = useState(ordem.servico_executado)
  const [pecas, setPecas] = useState(() =>
    (ordem.pecas_trocadas.length ? ordem.pecas_trocadas : pecasDoOrcamento(ordem.orcamento)).map((p) => ({ trocada: true, ...p })),
  )
  const aprovadoEm = ordem.orcamento?.data_resposta

  const mudar = (i, campo, valor) => setPecas(pecas.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)))

  return (
    <div className="painel-acao" ref={refAcao} tabIndex={-1}>
      <Cabecalho titulo="Registrar reparo" sub={`Serviço executado e peças trocadas${aprovadoEm ? ` · aprovado pelo cliente em ${data(aprovadoEm)}` : ''}`} />
      <div className="field">
        <label htmlFor="r-servico">Serviço executado *</label>
        <textarea id="r-servico" className="input" value={servico} onChange={(e) => setServico(e.target.value)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-neutral-400)' }}>
          <span>Peças trocadas</span>
          <button className="btn-link" style={{ fontSize: 12 }} onClick={() => setPecas([...pecas, { descricao: '', quantidade: 1, prevista: false, trocada: true }])}>
            + Peça não prevista no orçamento
          </button>
        </div>
        {pecas.length === 0 && <div style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>Nenhuma peça prevista no orçamento.</div>}
        {pecas.map((p, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-800)', fontSize: 13.5 }}
          >
            <label className="check" style={{ alignItems: 'center' }}>
              <input type="checkbox" checked={p.trocada} onChange={(e) => mudar(i, 'trocada', e.target.checked)} aria-label={`Peça trocada: ${p.descricao}`} />
              <span className="caixa" style={{ marginTop: 0 }}>
                <i className="ph ph-check" />
              </span>
            </label>
            {p.prevista ? (
              <span style={{ flex: 1 }}>{p.descricao}</span>
            ) : (
              <input className="input" style={{ flex: 1, minHeight: 30 }} placeholder="Descrição da peça" value={p.descricao} onChange={(e) => mudar(i, 'descricao', e.target.value)} />
            )}
            <span style={{ color: 'var(--color-neutral-500)', fontSize: 12.5 }}>{p.prevista ? 'previsto no orçamento' : 'não prevista'}</span>
            <input
              className="input"
              type="number"
              min="1"
              style={{ width: 64, minHeight: 30, textAlign: 'right' }}
              value={p.quantidade}
              onChange={(e) => mudar(i, 'quantidade', e.target.value)}
              aria-label="Quantidade"
            />
            <span style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>un.</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={concluir}>
          Salvar rascunho
        </button>
        <button className="btn btn-primary" onClick={concluir}>
          <i className="ph ph-check-circle" />
          Salvar e marcar como pronto
        </button>
      </div>
    </div>
  )
}

function PainelConcluido({ ordem, refAcao }) {
  const entregue = ordem.status === 'entregue'
  if (ordem.status === 'orcamento_recusado') {
    return (
      <div className="painel-acao" ref={refAcao} tabIndex={-1}>
        <Cabecalho titulo="Orçamento recusado" sub={`Recusa registrada em ${data(ordem.orcamento?.data_resposta)}`} />
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-neutral-300)' }}>
          O reparo não será feito. Registre a entrega quando o equipamento for devolvido ao cliente.
        </div>
      </div>
    )
  }
  return (
    <div className="painel-acao" ref={refAcao} tabIndex={-1} style={entregue ? { borderColor: 'var(--color-neutral-800)', boxShadow: 'none' } : undefined}>
      <div className="painel-titulo">{entregue ? 'OS entregue' : 'Reparo concluído'}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--color-neutral-300)' }}>{ordem.servico_executado || 'Sem reparo: orçamento recusado.'}</div>
      {ordem.pecas_trocadas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ordem.pecas_trocadas.map((p, i) => (
            <span key={i} className="tag tag-neutral">
              {p.descricao} ×{p.quantidade}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTop: '1px solid var(--color-neutral-800)' }}>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
          {entregue
            ? `Entregue em ${dataHora(ordem.data_entrega)}${ordem.recebido_por ? ` · recebido por ${ordem.recebido_por}` : ''}`
            : `Pronto desde ${diaMesHora(ordem.data_status).replace(' ', ' às ')}`}
        </span>
        {ordem.orcamento && <span style={{ fontSize: 22, fontWeight: 500 }}>{moeda(totalOrcamento(ordem.orcamento))}</span>}
      </div>
    </div>
  )
}

function CabecalhoDialogo({ id, titulo, onFechar }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="dialog-title" id={id}>
        {titulo}
      </span>
      <button className="btn btn-icon" style={{ width: 30, height: 30, color: 'var(--color-neutral-400)' }} onClick={onFechar} aria-label="Fechar">
        <i className="ph ph-x" />
      </button>
    </div>
  )
}

function DialogoResposta({ ordem, situacaoInicial, onFechar, concluir }) {
  const [situacao, setSituacao] = useState(situacaoInicial)
  const [dia, setDia] = useState(() => dataIso(agoraIso()))
  const [observacao, setObservacao] = useState('')
  const aprovado = situacao === 'aprovado'


  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="dialog" style={{ width: 460 }} role="dialog" aria-labelledby="dr-titulo">
        <CabecalhoDialogo id="dr-titulo" titulo="Registrar resposta do orçamento" onFechar={onFechar} />
        <div className="field">
          <label>Resposta do cliente</label>
          <div className="seg" style={{ display: 'flex' }}>
            {[
              ['aprovado', 'ph-check', 'Aprovado'],
              ['recusado', 'ph-x', 'Recusado'],
            ].map(([valor, icone, rotulo]) => (
              <label key={valor} className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
                <input type="radio" name="resposta" checked={situacao === valor} onChange={() => setSituacao(valor)} />
                <i className={`ph ${icone}`} />
                {rotulo}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label htmlFor="dr-dia">Data da resposta *</label>
            <input id="dr-dia" type="date" className="input" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div className="field">
            <label>Valor {aprovado ? 'aprovado' : 'recusado'}</label>
            <div className="input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-neutral-400)' }}>
              {moeda(totalOrcamento(ordem.orcamento))}
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="dr-obs">Observação</label>
          <input id="dr-obs" className="input" placeholder="Ex.: aprovou por mensagem às 10:20" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
        <div className="nota" style={{ alignItems: 'center' }}>
          <i className="ph ph-arrow-right" style={{ color: 'var(--color-accent-300)' }} />
          <span>
            Status passa de {infoStatus(ordem.status).rotulo} para <b style={{ fontWeight: 500 }}>{aprovado ? 'Em reparo' : 'Orçamento recusado'}</b>
          </span>
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className={`btn ${aprovado ? 'btn-primary' : 'btn-secondary btn-perigo'}`} onClick={concluir}>
            <i className={`ph ${aprovado ? 'ph-check' : 'ph-x'}`} />
            {aprovado ? 'Confirmar aprovação' : 'Confirmar recusa'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DialogoEntrega({ ordem, onFechar, concluir }) {
  const [dia, setDia] = useState(() => dataIso(agoraIso()))
  const [horario, setHorario] = useState(() => hora(agoraIso()))
  const [recebidoPor, setRecebidoPor] = useState(`${ordem.cliente.nome} (cliente)`)


  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="dialog" style={{ width: 460 }} role="dialog" aria-labelledby="de-titulo">
        <CabecalhoDialogo id="de-titulo" titulo="Registrar entrega" onFechar={onFechar} />
        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>
          {ordem.equipamento.modelo} · OS {ordem.numero} · {ordem.cliente.nome}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label htmlFor="de-dia">Data da entrega *</label>
            <input id="de-dia" type="date" className="input" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="de-hora">Horário *</label>
            <input id="de-hora" type="time" className="input" value={horario} onChange={(e) => setHorario(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="de-recebido">Recebido por</label>
          <input id="de-recebido" className="input" value={recebidoPor} onChange={(e) => setRecebidoPor(e.target.value)} />
        </div>
        <div className="nota">
          <i className="ph ph-lock-simple" style={{ color: 'var(--color-accent-300)', marginTop: 2 }} />
          <span>
            O status muda para <b style={{ fontWeight: 500 }}>Entregue</b> e a OS é encerrada. Depois disso ela só pode ser consultada.
          </span>
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={concluir}>
            <i className="ph ph-handshake" />
            Confirmar entrega
          </button>
        </div>
      </div>
    </div>
  )
}

function CartaoResumo({ titulo, icone, linhas }) {
  return (
    <div className="painel painel-pad" style={{ gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 500 }}>
        <i className={`ph ${icone}`} style={{ color: 'var(--color-neutral-400)' }} />
        {titulo}
      </div>
      {linhas.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', fontSize: 13, lineHeight: 1.45 }}>
          <span style={{ color: 'var(--color-neutral-500)', fontSize: 12 }}>{k}</span>
          <span style={{ color: 'var(--color-neutral-200)' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

// Cartões de apoio abaixo da ação, como no mockup: o que importa para a etapa atual.
function resumos(ordem) {
  const problema = { titulo: 'Problema relatado', icone: 'ph-chat-text', linhas: [[`Relato do cliente (${data(ordem.data_abertura).slice(0, 5)})`, ordem.problema_relatado]] }
  const retirada = {
    titulo: 'Retirada do equipamento',
    icone: 'ph-truck',
    linhas: [
      ['Combinada', dataHora(ordem.retirada_agendada).replace(' ', ' às ')],
      ['Realizada', ordem.data_retirada ? dataHora(ordem.data_retirada).replace(' ', ' às ') : 'ainda não'],
    ],
  }
  const diagnostico = {
    titulo: 'Diagnóstico',
    icone: 'ph-stethoscope',
    linhas: [
      ['Causa do defeito', ordem.diagnostico || '—'],
      ['O que precisa ser feito', ordem.servico_necessario || '—'],
    ],
  }
  const mapa = {
    aberta: [problema, retirada],
    aguardando_diagnostico: [problema, retirada],
    diagnostico_realizado: [diagnostico, problema],
    orcamento_enviado: [diagnostico, retirada],
    aguardando_aprovacao: [diagnostico, retirada],
    orcamento_recusado: [diagnostico, problema],
    em_reparo: [diagnostico, problema],
    pronto_para_retirada: [diagnostico, retirada],
    entregue: [diagnostico, problema],
  }
  return mapa[ordem.status]
}

const DESCRICAO_HISTORICO = {
  aberta: (o) => `OS aberta · retirada combinada para ${diaMesHora(o.retirada_agendada).replace(' ', ' às ')}`,
  aguardando_diagnostico: () => 'Equipamento retirado no endereço do cliente',
  diagnostico_realizado: () => 'Causa e serviço necessário registrados',
  orcamento_enviado: () => 'Mensagem de orçamento aberta no WhatsApp',
  aguardando_aprovacao: () => 'Aguardando resposta do cliente',
  em_reparo: (o) => `Aprovação registrada${o.orcamento?.data_resposta ? ` · resposta em ${data(o.orcamento.data_resposta).slice(0, 5)}` : ''}`,
  orcamento_recusado: (o) => `Recusa registrada${o.orcamento?.data_resposta ? ` · resposta em ${data(o.orcamento.data_resposta).slice(0, 5)}` : ''}`,
  pronto_para_retirada: () => 'Serviço executado e peças trocadas registrados',
  entregue: (o) => `OS encerrada${o.recebido_por ? ` · recebido por ${o.recebido_por}` : ''}`,
}

// Histórico automático das mudanças de status (RF22, RF25).
function Historico({ ordem }) {
  return (
    <div className="painel painel-pad" style={{ gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 500 }}>Histórico</span>
        <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>ordem cronológica · automático</span>
      </div>
      {ordem.historico.map((h, i, lista) => {
        const ultimo = i === lista.length - 1
        const cor = corStatus(h.status_novo)
        return (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  marginTop: 4,
                  flex: 'none',
                  background: cor,
                  boxShadow: ultimo ? `0 0 0 4px color-mix(in srgb, ${cor} 20%, transparent)` : 'none',
                }}
              />
              <span style={{ flex: 1, width: 1, minHeight: 10, background: ultimo ? 'transparent' : 'var(--color-neutral-800)' }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 12, fontSize: 13, lineHeight: 1.4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 500 }}>{infoStatus(h.status_novo).rotulo}</span>
                <span style={{ color: 'var(--color-neutral-500)', fontSize: 12, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{diaMesHora(h.data_hora)}</span>
              </div>
              <div style={{ color: 'var(--color-neutral-500)' }}>{DESCRICAO_HISTORICO[h.status_novo](ordem)}</div>
              {h.observacao && <div style={{ color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>“{h.observacao}”</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CartaoMensagem({ titulo, texto, nota, onEnviar }) {
  return (
    <div className="painel painel-pad" style={{ gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, fontSize: 13.5 }}>{titulo}</span>
        <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>gerada automaticamente</span>
      </div>
      <div
        style={{
          background: 'var(--color-accent-900)',
          border: '1px solid var(--color-accent-800)',
          borderRadius: '12px 12px 4px 12px',
          padding: '10px 12px',
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--color-neutral-200)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {texto}
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 0 }} onClick={onEnviar ?? undefined} disabled={!onEnviar}>
        <i className="ph ph-whatsapp-logo" />
        Enviar WhatsApp
      </button>
      <div style={{ fontSize: 11.5, color: 'var(--color-neutral-500)', lineHeight: 1.45 }}>{nota}</div>
    </div>
  )
}

// Detalhe da OS com a ação da etapa atual (RF09 a RF20, RF22, RF24, RF25).
export default function DetalheOs({ id }) {
  const { ordens } = useDados()
  // Sem backend por enquanto: as ações só voltam para a lista de OS pendentes.
  const concluir = () => navegar('/pendentes')
  const ordem = ordens.find((o) => o.id === id)
  const refAcao = useRef(null)
  const [dialogo, setDialogo] = useState(null)
  // O orçamento em edição fica aqui porque a mensagem na coluna da direita depende dele.
  const [itens, setItens] = useState(() => ordem?.orcamento?.itens ?? [])
  const [prazo, setPrazo] = useState(() => ordem?.orcamento?.prazo_entrega ?? 2)

  if (!ordem) {
    return (
      <Layout ativo="os" trilha="OS">
        <div style={{ padding: 28, color: 'var(--color-neutral-400)' }}>
          OS não encontrada. <a href="#/os">Voltar para a busca</a>
        </div>
      </Layout>
    )
  }

  const { cliente, equipamento, status } = ordem
  const entregue = status === 'entregue'
  const proximo = PROXIMO[status]
  const waNumero = `55${cliente.telefone_whatsapp.replace(/\D/g, '')}`

  function acaoPrincipal() {
    if (['orcamento_enviado', 'aguardando_aprovacao'].includes(status)) return setDialogo({ tipo: 'resposta', situacao: 'aprovado' })
    if (['pronto_para_retirada', 'orcamento_recusado'].includes(status)) return setDialogo({ tipo: 'entrega' })
    refAcao.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    refAcao.current?.focus({ preventScroll: true })
  }

  const rascunho = {
    itens: itens.filter((i) => i.descricao.trim()).map((i) => ({ ...i, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario) })),
    prazo_entrega: Number(prazo),
  }
  const rascunhoValido = rascunho.itens.length > 0 && totalOrcamento(rascunho) > 0 && rascunho.prazo_entrega > 0

  const props = { ordem, concluir, refAcao }
  let painel
  if (status === 'aberta') painel = <PainelRetirada {...props} />
  else if (status === 'aguardando_diagnostico') painel = <PainelDiagnostico {...props} />
  else if (status === 'diagnostico_realizado') painel = <PainelOrcamento itens={itens} setItens={setItens} prazo={prazo} setPrazo={setPrazo} refAcao={refAcao} />
  else if (status === 'orcamento_enviado' || status === 'aguardando_aprovacao')
    painel = <PainelResposta ordem={ordem} refAcao={refAcao} onResponder={(situacao) => setDialogo({ tipo: 'resposta', situacao })} />
  else if (status === 'em_reparo') painel = <PainelReparo {...props} />
  else painel = <PainelConcluido ordem={ordem} refAcao={refAcao} />

  let mensagem = null
  if (status === 'diagnostico_realizado') {
    mensagem = (
      <CartaoMensagem
        titulo="Mensagem do orçamento"
        texto={rascunhoValido ? mensagemOrcamento(ordem, rascunho) : 'Adicione os itens e o prazo para gerar a mensagem.'}
        nota={`Abre wa.me/${waNumero} com o texto preenchido. Ao enviar, o status vai para Orçamento enviado e em seguida Aguardando aprovação.`}
        onEnviar={() => abrirWhatsApp(ordem, mensagemOrcamento(ordem, rascunho))}
      />
    )
  } else if (status === 'pronto_para_retirada') {
    mensagem = (
      <CartaoMensagem
        titulo="Aviso de pronto para retirada"
        texto={mensagemPronto(ordem)}
        nota={
          ordem.aviso_pronto_em
            ? `Enviado em ${diaMesHora(ordem.aviso_pronto_em).replace(' ', ' às ')} · reenvie se o cliente não responder.`
            : `Abre wa.me/${waNumero} com o texto preenchido.`
        }
        onEnviar={() => abrirWhatsApp(ordem, mensagemPronto(ordem))}
      />
    )
  }

  const subtitulo = [
    `OS ${ordem.numero}`,
    `aberta em ${dataHora(ordem.data_abertura)}`,
    equipamento.numero_serie && `nº de série ${equipamento.numero_serie}`,
    cliente.nome.split(' ')[0],
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Layout
      ativo={entregue ? 'os' : 'painel'}
      trilha={
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon" style={{ width: 28, height: 28, color: 'var(--color-neutral-400)' }} onClick={() => window.history.back()} aria-label="Voltar">
            <i className="ph ph-arrow-left" />
          </button>
          <span>
            <a href={entregue ? '#/os' : '#/pendentes'} style={{ color: 'inherit' }}>
              {entregue ? 'Buscar OS' : 'OS pendentes'}
            </a>{' '}
            / <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>OS {ordem.numero}</span>
          </span>
        </span>
      }
      acoes={
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <i className="ph ph-printer" />
          Imprimir
        </button>
      }
    >
      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              flex: 'none',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-neutral-900)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 26,
              color: 'var(--color-neutral-300)',
            }}
          >
            <i className={`ph ${iconeEquipamento(equipamento.tipo)}`} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>
                {nomeEquipamento(equipamento)}
              </span>
              <PillGrande status={status} />
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>{subtitulo}</div>
          </div>
          <button className="btn btn-secondary" onClick={() => abrirWhatsApp(ordem, mensagemStatus(ordem))}>
            <i className="ph ph-whatsapp-logo" />
            Enviar WhatsApp
          </button>
          {proximo && (
            <button className="btn btn-primary" onClick={acaoPrincipal}>
              <i className={`ph ${proximo.icone}`} />
              {proximo.rotulo}
            </button>
          )}
        </div>

        <Etapas ordem={ordem} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {painel}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
              {resumos(ordem).map((r) => (
                <CartaoResumo key={r.titulo} {...r} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="painel painel-pad" style={{ gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
                  {inicial(cliente.nome)}
                </span>
                <div style={{ flex: 1, lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 500 }}>{cliente.nome}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>WhatsApp {cliente.telefone_whatsapp}</div>
                </div>
                <a href={`#/clientes/${cliente.id}`} style={{ fontSize: 12.5 }}>
                  Ver ficha
                </a>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--color-neutral-400)' }}>
                <i className="ph ph-map-pin" style={{ marginTop: 2 }} />
                {cliente.endereco}
              </div>
            </div>
            {mensagem}
            <Historico ordem={ordem} />
          </div>
        </div>
      </div>

      {dialogo?.tipo === 'resposta' && (
        <DialogoResposta ordem={ordem} situacaoInicial={dialogo.situacao} onFechar={() => setDialogo(null)} concluir={concluir} />
      )}
      {dialogo?.tipo === 'entrega' && <DialogoEntrega ordem={ordem} onFechar={() => setDialogo(null)} concluir={concluir} />}
    </Layout>
  )
}
