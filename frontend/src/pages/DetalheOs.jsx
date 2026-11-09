import { useEffect, useRef, useState } from 'react'
import ErroCampo from '../components/ErroCampo'
import Layout from '../components/Layout'
import { useDados } from '../data/contexto'
import { data, dataHora, dataIso, diaMesHora, hora, inicial, linkWhatsApp, moeda, nomeEquipamento, telefone, tempoNaEtapa, totalOrcamento } from '../data/formato'
import { mensagemLembreteAprovacao, mensagemOrcamento } from '../data/mensagens'
import { detalhar, estaParada, lerPecas, pecasDoOrcamento, proximoStatus, textoPecas } from '../data/regras'
import { corStatus, FLUXO, iconeEquipamento, infoStatus } from '../data/status'
import {
  buscarOrdem,
  enviarOrcamento,
  marcarPronto,
  mensagemWhatsApp,
  registrarDiagnostico,
  registrarEntrega,
  registrarReparo,
  registrarRetirada,
  responderOrcamento,
  salvarOrcamento,
} from '../services/ordens'

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

const CANAIS = [
  ['whatsapp', 'WhatsApp'],
  ['telefone', 'Telefone'],
  ['presencial', 'Presencial'],
]

// Abre a aba antes de chamar a API (depois de um await o navegador bloquearia o pop-up) e então
// leva a aba para o link wa.me com a mensagem do status atual montada pelo backend (RF18).
// `antes` roda primeiro, por exemplo para registrar o envio do orçamento.
// `montar` troca a mensagem do status por outra, recebendo a resposta da API (com o link de acompanhamento).
async function abrirWhatsAppDaApi(id, antes, montar) {
  const janela = window.open('', '_blank')
  try {
    if (antes) await antes()
    const resposta = await mensagemWhatsApp(id)
    const link = montar ? montar(resposta) : resposta.link
    if (janela) {
      janela.opener = null
      janela.location.href = link
    } else {
      window.open(link, '_blank', 'noopener')
    }
  } catch (erro) {
    janela?.close()
    throw erro
  }
}

// Estado de envio e erros (422 por campo ou mensagem geral) de uma ação da OS.
function useAcao() {
  const [erros, setErros] = useState({})
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function rodar(acao) {
    setErros({})
    setErro('')
    setEnviando(true)
    try {
      await acao()
    } catch (falha) {
      if (falha.erros) setErros(falha.erros)
      else setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return { erros, erro, enviando, rodar }
}

// Primeiro erro de validação ainda não mostrado ao lado de um campo, ou o erro geral.
function ErroAcao({ acao, campos = [] }) {
  const resto = Object.entries(acao.erros).find(([campo]) => !campos.includes(campo))
  const mensagem = resto?.[1]?.[0] ?? acao.erro
  return mensagem ? (
    <div role="alert">
      <ErroCampo erros={[mensagem]} />
    </div>
  ) : null
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

function PainelRetirada({ ordem, endereco, atualizar, refAcao }) {
  const acao = useAcao()
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
        {ordem.retirada_agendada ? `Retirada combinada para ${dataHora(ordem.retirada_agendada)}` : 'Retirada ainda sem horário combinado'}
        {endereco ? ` em ${endereco}.` : '.'}
      </div>
      <ErroAcao acao={acao} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => acao.rodar(() => abrirWhatsAppDaApi(ordem.id))}>
          <i className="ph ph-whatsapp-logo" />
          Confirmar horário
        </button>
        <button className="btn btn-primary" disabled={acao.enviando} onClick={() => acao.rodar(async () => atualizar(await registrarRetirada(ordem.id, {})))}>
          <i className="ph ph-check" />
          {acao.enviando ? 'Registrando…' : 'Equipamento retirado'}
        </button>
      </div>
    </div>
  )
}

function PainelDiagnostico({ ordem, atualizar, refAcao }) {
  const [diagnostico, setDiagnostico] = useState(ordem.diagnostico ?? '')
  const acao = useAcao()
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
        <label htmlFor="d-diagnostico">Causa do defeito e o que precisa ser feito *</label>
        <textarea
          id="d-diagnostico"
          className={`input${acao.erros.diagnostico ? ' input-erro' : ''}`}
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
        />
        <ErroCampo erros={acao.erros.diagnostico} />
      </div>
      <ErroAcao acao={acao} campos={['diagnostico']} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => setDiagnostico(ordem.diagnostico ?? '')}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          disabled={acao.enviando}
          onClick={() => acao.rodar(async () => atualizar(await registrarDiagnostico(ordem.id, diagnostico)))}
        >
          <i className="ph ph-check" />
          {acao.enviando ? 'Salvando…' : 'Salvar diagnóstico'}
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

function PainelOrcamento({ itens, setItens, prazo, setPrazo, acao, onSalvar, salvoEm, refAcao }) {
  const total = totalOrcamento({ itens })
  const { erros } = acao
  const classe = (i, campo) => `input${erros[`itens.${i}.${campo}`] ? ' input-erro' : ''}`
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
            className={classe(i, 'descricao')}
            style={{ minHeight: 32 }}
            placeholder={item.tipo === 'peca' ? 'Ex.: SSD 480GB' : 'Ex.: Limpeza interna'}
            value={item.descricao}
            onChange={mudar(i, 'descricao')}
            aria-label="Descrição"
          />
          <input className={classe(i, 'quantidade')} style={{ minHeight: 32 }} type="number" min="1" value={item.quantidade} onChange={mudar(i, 'quantidade')} aria-label="Quantidade" />
          <input className={classe(i, 'valor_unitario')} style={{ minHeight: 32 }} type="number" min="0" step="0.01" value={item.valor_unitario} onChange={mudar(i, 'valor_unitario')} aria-label="Valor unitário" />
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
            <input
              id="o-prazo"
              className={`input${erros.prazo_dias ? ' input-erro' : ''}`}
              type="number"
              min="1"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              style={{ paddingRight: 130 }}
            />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--color-neutral-500)' }}>
              dias úteis{Number(prazo) > 0 && ` · até ${data(prazoAte(Number(prazo))).slice(0, 5)}`}
            </span>
          </div>
          <ErroCampo erros={erros.prazo_dias} />
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>Valor total calculado</div>
          <div style={{ fontSize: 28, fontWeight: 500 }}>{moeda(total)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px 14px' }}>
        <div style={{ flex: 1 }}>
          <ErroAcao acao={acao} campos={['prazo_dias']} />
        </div>
        {salvoEm && <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>Rascunho salvo às {hora(salvoEm)}</span>}
        <button className="btn btn-secondary" disabled={acao.enviando} onClick={onSalvar}>
          Salvar rascunho
        </button>
      </div>
    </div>
  )
}

function PainelResposta({ ordem, onResponder, refAcao }) {
  const { orcamento } = ordem
  const parada = estaParada(ordem)
  const acao = useAcao()

  // O lembrete leva o link da tela de acompanhamento, onde o cliente aprova ou recusa sozinho.
  function cobrarResposta() {
    acao.rodar(() =>
      abrirWhatsAppDaApi(ordem.id, null, ({ acompanhamento }) =>
        linkWhatsApp(ordem.cliente.telefone_whatsapp, mensagemLembreteAprovacao(ordem, acompanhamento)),
      ),
    )
  }

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
          Prazo: {orcamento.prazo_dias} {orcamento.prazo_dias === 1 ? 'dia útil' : 'dias úteis'} após aprovação
          {orcamento.validade_ate && ` · ${orcamento.vencido ? 'venceu em' : 'válido até'} ${data(`${orcamento.validade_ate.slice(0, 10)}T12:00`)}`}
        </span>
        <span style={{ fontSize: 22, fontWeight: 500 }}>{moeda(totalOrcamento(orcamento))}</span>
      </div>
      <div className="nota" style={{ alignItems: 'center' }}>
        <i className="ph ph-link" style={{ color: 'var(--color-accent-300)' }} />
        <span>O cliente também pode aprovar ou recusar pelo link de acompanhamento enviado no WhatsApp; a resposta aparece aqui sozinha.</span>
      </div>
      <ErroAcao acao={acao} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {parada && (
          <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={cobrarResposta}>
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

function PainelReparo({ ordem, atualizar, refAcao }) {
  const [servico, setServico] = useState(ordem.servico_executado ?? '')
  const [pecas, setPecas] = useState(() => {
    const previstas = pecasDoOrcamento(ordem.orcamento)
    if (!ordem.pecas_trocadas) return previstas.map((p) => ({ ...p, trocada: true }))
    // Rascunho já salvo: marca as trocadas e mantém as previstas que ficaram de fora.
    const salvas = lerPecas(ordem.pecas_trocadas).map((p) => ({ ...p, prevista: previstas.some((x) => x.descricao === p.descricao), trocada: true }))
    const restantes = previstas.filter((p) => !salvas.some((x) => x.descricao === p.descricao)).map((p) => ({ ...p, trocada: false }))
    return [...salvas, ...restantes]
  })
  const acao = useAcao()
  const aprovadoEm = ordem.orcamento?.data_resposta

  const mudar = (i, campo, valor) => setPecas(pecas.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)))
  const salvar = () => registrarReparo(ordem.id, { servico_executado: servico, pecas_trocadas: textoPecas(pecas.filter((p) => p.trocada)) || null })

  return (
    <div className="painel-acao" ref={refAcao} tabIndex={-1}>
      <Cabecalho titulo="Registrar reparo" sub={`Serviço executado e peças trocadas${aprovadoEm ? ` · aprovado pelo cliente em ${data(aprovadoEm)}` : ''}`} />
      <div className="field">
        <label htmlFor="r-servico">Serviço executado *</label>
        <textarea
          id="r-servico"
          className={`input${acao.erros.servico_executado ? ' input-erro' : ''}`}
          value={servico}
          onChange={(e) => setServico(e.target.value)}
        />
        <ErroCampo erros={acao.erros.servico_executado} />
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
              <input
                className="input"
                style={{ flex: 1, minHeight: 30 }}
                placeholder="Descrição da peça"
                aria-label="Descrição da peça"
                value={p.descricao}
                onChange={(e) => mudar(i, 'descricao', e.target.value)}
              />
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
        <ErroCampo erros={acao.erros.pecas_trocadas} />
      </div>
      <ErroAcao acao={acao} campos={['servico_executado', 'pecas_trocadas']} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" disabled={acao.enviando} onClick={() => acao.rodar(async () => atualizar(await salvar()))}>
          Salvar rascunho
        </button>
        <button
          className="btn btn-primary"
          disabled={acao.enviando}
          onClick={() =>
            acao.rodar(async () => {
              atualizar(await salvar())
              atualizar(await marcarPronto(ordem.id))
            })
          }
        >
          <i className="ph ph-check-circle" />
          {acao.enviando ? 'Salvando…' : 'Salvar e marcar como pronto'}
        </button>
      </div>
    </div>
  )
}

function PainelConcluido({ ordem, refAcao }) {
  const entregue = ordem.status === 'entregue'
  const pecas = lerPecas(ordem.pecas_trocadas)
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
      {pecas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {pecas.map((p, i) => (
            <span key={i} className="tag tag-neutral">
              {p.descricao} ×{p.quantidade}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTop: '1px solid var(--color-neutral-800)' }}>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
          {entregue
            ? `Entregue em ${dataHora(ordem.data_entrega)}`
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

function DialogoResposta({ ordem, situacaoInicial, onFechar, atualizar }) {
  const [situacao, setSituacao] = useState(situacaoInicial)
  const [canal, setCanal] = useState('whatsapp')
  const [observacao, setObservacao] = useState('')
  const acao = useAcao()
  const aprovado = situacao === 'aprovado'

  function confirmar() {
    acao.rodar(async () => {
      atualizar(await responderOrcamento(ordem.id, { aprovado, canal, observacao: observacao.trim() || null }))
      onFechar()
    })
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="dialog" style={{ width: 460 }} role="dialog" aria-modal="true" aria-labelledby="dr-titulo">
        <CabecalhoDialogo id="dr-titulo" titulo="Registrar resposta do orçamento" onFechar={onFechar} />
        <div className="field">
          <span id="dr-resposta" style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>
            Resposta do cliente
          </span>
          <div className="seg" style={{ display: 'flex' }} role="radiogroup" aria-labelledby="dr-resposta">
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
            <label htmlFor="dr-canal">Respondeu por *</label>
            <select id="dr-canal" className={`input${acao.erros.canal ? ' input-erro' : ''}`} value={canal} onChange={(e) => setCanal(e.target.value)}>
              {CANAIS.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
            <ErroCampo erros={acao.erros.canal} />
          </div>
          <div className="field">
            <span style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>Valor {aprovado ? 'aprovado' : 'recusado'}</span>
            <div className="input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-neutral-400)' }}>
              {moeda(totalOrcamento(ordem.orcamento))}
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="dr-obs">Observação</label>
          <input
            id="dr-obs"
            className={`input${acao.erros.observacao ? ' input-erro' : ''}`}
            placeholder="Ex.: aprovou por mensagem às 10:20"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <ErroCampo erros={acao.erros.observacao} />
        </div>
        <div className="nota" style={{ alignItems: 'center' }}>
          <i className="ph ph-arrow-right" style={{ color: 'var(--color-accent-300)' }} />
          <span>
            Status passa de {infoStatus(ordem.status).rotulo} para <b style={{ fontWeight: 500 }}>{aprovado ? 'Em reparo' : 'Orçamento recusado'}</b>. A data da
            resposta é registrada agora.
          </span>
        </div>
        <ErroAcao acao={acao} campos={['canal', 'observacao']} />
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className={`btn ${aprovado ? 'btn-primary' : 'btn-secondary btn-perigo'}`} disabled={acao.enviando} onClick={confirmar}>
            <i className={`ph ${aprovado ? 'ph-check' : 'ph-x'}`} />
            {aprovado ? 'Confirmar aprovação' : 'Confirmar recusa'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DialogoEntrega({ ordem, onFechar, atualizar }) {
  const [dia, setDia] = useState(() => dataIso(agoraIso()))
  const [horario, setHorario] = useState(() => hora(agoraIso()))
  const [recebidoPor, setRecebidoPor] = useState(`${ordem.cliente.nome} (cliente)`)
  const acao = useAcao()
  const semReparo = ordem.status === 'orcamento_recusado'

  function confirmar() {
    acao.rodar(async () => {
      const quem = recebidoPor.trim()
      atualizar(
        await registrarEntrega(ordem.id, {
          data_entrega: dia && horario ? new Date(`${dia}T${horario}`).toISOString() : null,
          observacao: quem ? `${semReparo ? 'Devolvido sem reparo' : 'Equipamento entregue'} · recebido por ${quem}` : null,
        }),
      )
      onFechar()
    })
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="dialog" style={{ width: 460 }} role="dialog" aria-modal="true" aria-labelledby="de-titulo">
        <CabecalhoDialogo id="de-titulo" titulo="Registrar entrega" onFechar={onFechar} />
        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)' }}>
          {ordem.equipamento.modelo} · {ordem.numero} · {ordem.cliente.nome}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label htmlFor="de-dia">Data da entrega *</label>
            <input id="de-dia" type="date" className={`input${acao.erros.data_entrega ? ' input-erro' : ''}`} value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="de-hora">Horário *</label>
            <input id="de-hora" type="time" className={`input${acao.erros.data_entrega ? ' input-erro' : ''}`} value={horario} onChange={(e) => setHorario(e.target.value)} />
          </div>
        </div>
        <ErroCampo erros={acao.erros.data_entrega} />
        <div className="field">
          <label htmlFor="de-recebido">Recebido por</label>
          <input id="de-recebido" className="input" value={recebidoPor} onChange={(e) => setRecebidoPor(e.target.value)} />
          <ErroCampo erros={acao.erros.observacao} />
        </div>
        <div className="nota">
          <i className="ph ph-lock-simple" style={{ color: 'var(--color-accent-300)', marginTop: 2 }} />
          <span>
            O status muda para <b style={{ fontWeight: 500 }}>Entregue</b> e a OS é encerrada. Depois disso ela só pode ser consultada.
          </span>
        </div>
        <ErroAcao acao={acao} campos={['data_entrega', 'observacao']} />
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={acao.enviando} onClick={confirmar}>
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
      ['Combinada', ordem.retirada_agendada ? dataHora(ordem.retirada_agendada).replace(' ', ' às ') : 'sem horário'],
      ['Realizada', ordem.data_retirada ? dataHora(ordem.data_retirada).replace(' ', ' às ') : 'ainda não'],
    ],
  }
  const diagnostico = {
    titulo: 'Diagnóstico',
    icone: 'ph-stethoscope',
    linhas: [['Causa e o que precisa ser feito', ordem.diagnostico || '—']],
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

// Texto usado quando a mudança de status não tem observação gravada.
const DESCRICAO_HISTORICO = {
  aberta: 'OS aberta',
  aguardando_diagnostico: 'Equipamento retirado',
  diagnostico_realizado: 'Diagnóstico registrado',
  orcamento_enviado: 'Orçamento enviado pelo WhatsApp',
  aguardando_aprovacao: 'Aguardando resposta do cliente',
  em_reparo: 'Aprovação registrada',
  orcamento_recusado: 'Recusa registrada',
  pronto_para_retirada: 'Reparo concluído',
  entregue: 'OS encerrada',
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
                <span style={{ fontWeight: 500 }}>{h.status_novo_rotulo ?? infoStatus(h.status_novo).rotulo}</span>
                <span style={{ color: 'var(--color-neutral-500)', fontSize: 12, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{diaMesHora(h.data_hora)}</span>
              </div>
              <div style={{ color: 'var(--color-neutral-500)' }}>{h.observacao || DESCRICAO_HISTORICO[h.status_novo]}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CartaoMensagem({ titulo, texto, nota, onEnviar, erro, enviando }) {
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
      {erro && (
        <div role="alert">
          <ErroCampo erros={[erro]} />
        </div>
      )}
      <button className="btn btn-primary btn-block" style={{ marginTop: 0 }} onClick={onEnviar ?? undefined} disabled={!onEnviar || enviando}>
        <i className="ph ph-whatsapp-logo" />
        {enviando ? 'Enviando…' : 'Enviar WhatsApp'}
      </button>
      <div style={{ fontSize: 11.5, color: 'var(--color-neutral-500)', lineHeight: 1.45 }}>{nota}</div>
    </div>
  )
}

// Detalhe da OS com a ação da etapa atual (RF09 a RF20, RF22, RF24, RF25). Cada ação chama a etapa
// correspondente da API, que avança o status e grava o histórico; a tela mostra a OS devolvida.
export default function DetalheOs({ id }) {
  const { clientes, recarregar } = useDados()
  const [ordem, setOrdem] = useState(null)
  const [erroCarga, setErroCarga] = useState('')
  const refAcao = useRef(null)
  const [dialogo, setDialogo] = useState(null)
  // O orçamento em edição fica aqui porque a mensagem na coluna da direita depende dele.
  const [itens, setItens] = useState([])
  const [prazo, setPrazo] = useState(2)
  const [orcamentoSalvoEm, setOrcamentoSalvoEm] = useState(null)
  const acaoOrcamento = useAcao()
  const acaoWhatsApp = useAcao()
  // Mensagem do status atual montada pela API (pronto para retirada ou devolução sem reparo).
  const [mensagemApi, setMensagemApi] = useState(null)

  useEffect(() => {
    let ativo = true
    buscarOrdem(id)
      .then((os) => {
        if (!ativo) return
        setOrdem(detalhar(os))
        setItens(os.orcamento?.itens ?? [])
        setPrazo(os.orcamento?.prazo_dias ?? 2)
      })
      .catch((e) => ativo && setErroCarga(e.status === 404 ? 'OS não encontrada.' : e.message))
    return () => {
      ativo = false
    }
  }, [id])

  const status = ordem?.status
  useEffect(() => {
    if (!['pronto_para_retirada', 'orcamento_recusado'].includes(status)) return
    let ativo = true
    mensagemWhatsApp(id)
      .then((m) => ativo && setMensagemApi(m))
      .catch(() => ativo && setMensagemApi(null))
    return () => {
      ativo = false
    }
  }, [id, status])

  // As etapas devolvem a OS sem o cliente completo: mantém o equipamento e o cliente já carregados.
  function atualizar(nova) {
    setOrdem((atual) => detalhar({ ...atual, ...nova, equipamento: atual.equipamento }))
    recarregar()
  }

  if (!ordem) {
    return (
      <Layout ativo="os" trilha="OS">
        <div style={{ padding: 28, color: 'var(--color-neutral-400)' }} role={erroCarga ? 'alert' : 'status'}>
          {erroCarga ? (
            <>
              {erroCarga} <a href="#/os">Voltar para a busca</a>
            </>
          ) : (
            'Carregando OS…'
          )}
        </div>
      </Layout>
    )
  }

  const { cliente, equipamento } = ordem
  const endereco = clientes.find((c) => c.id === cliente.id)?.endereco
  const entregue = status === 'entregue'
  const proximo = PROXIMO[status]
  const waNumero = `55${cliente.telefone_whatsapp.replace(/\D/g, '')}`

  function acaoPrincipal() {
    if (['orcamento_enviado', 'aguardando_aprovacao'].includes(status)) return setDialogo({ tipo: 'resposta', situacao: 'aprovado' })
    if (['pronto_para_retirada', 'orcamento_recusado'].includes(status)) return setDialogo({ tipo: 'entrega' })
    refAcao.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    refAcao.current?.focus({ preventScroll: true })
  }

  const dadosOrcamento = () => ({
    prazo_dias: Number(prazo),
    itens: itens.map((i) => ({ tipo: i.tipo, descricao: i.descricao, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario) })),
  })

  function salvarRascunhoOrcamento() {
    acaoOrcamento.rodar(async () => {
      const orcamento = await salvarOrcamento(id, dadosOrcamento())
      setOrdem((atual) => ({ ...atual, orcamento }))
      setOrcamentoSalvoEm(new Date().toISOString())
    })
  }

  // Salva o orçamento, registra o envio (Orçamento enviado → Aguardando aprovação) e abre o WhatsApp
  // com a mensagem da API, que já traz a validade.
  function enviarOrcamentoWhatsApp() {
    acaoOrcamento.rodar(() =>
      abrirWhatsAppDaApi(id, async () => {
        await salvarOrcamento(id, dadosOrcamento())
        atualizar(await enviarOrcamento(id))
      }),
    )
  }

  const rascunho = {
    itens: itens.filter((i) => i.descricao.trim()).map((i) => ({ ...i, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario) })),
    prazo_dias: Number(prazo),
  }
  const rascunhoValido = rascunho.itens.length > 0 && totalOrcamento(rascunho) > 0 && rascunho.prazo_dias > 0

  const props = { ordem, atualizar, refAcao }
  let painel
  if (status === 'aberta') painel = <PainelRetirada {...props} endereco={endereco} />
  else if (status === 'aguardando_diagnostico') painel = <PainelDiagnostico {...props} />
  else if (status === 'diagnostico_realizado')
    painel = (
      <PainelOrcamento
        itens={itens}
        setItens={setItens}
        prazo={prazo}
        setPrazo={setPrazo}
        acao={acaoOrcamento}
        onSalvar={salvarRascunhoOrcamento}
        salvoEm={orcamentoSalvoEm}
        refAcao={refAcao}
      />
    )
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
        nota={`Abre wa.me/${waNumero} com o texto preenchido. Ao enviar, o orçamento é salvo e travado, e o status vai para Orçamento enviado e em seguida Aguardando aprovação.`}
        onEnviar={rascunhoValido ? enviarOrcamentoWhatsApp : null}
        enviando={acaoOrcamento.enviando}
      />
    )
  } else if (mensagemApi && ['pronto_para_retirada', 'orcamento_recusado'].includes(status)) {
    mensagem = (
      <CartaoMensagem
        titulo={status === 'pronto_para_retirada' ? 'Aviso de pronto para retirada' : 'Aviso de devolução sem reparo'}
        texto={mensagemApi.mensagem}
        nota={`Abre wa.me/${mensagemApi.telefone} com o texto preenchido. Reenvie se o cliente não responder.`}
        onEnviar={() => acaoWhatsApp.rodar(() => abrirWhatsAppDaApi(id))}
        erro={acaoWhatsApp.erro}
        enviando={acaoWhatsApp.enviando}
      />
    )
  }

  const subtitulo = [
    ordem.numero,
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
            / <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{ordem.numero}</span>
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
          <button className="btn btn-secondary" disabled={acaoWhatsApp.enviando} onClick={() => acaoWhatsApp.rodar(() => abrirWhatsAppDaApi(id))}>
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

        {acaoWhatsApp.erro && !mensagem && (
          <div role="alert">
            <ErroCampo erros={[acaoWhatsApp.erro]} />
          </div>
        )}

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
                  <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>WhatsApp {telefone(cliente.telefone_whatsapp)}</div>
                </div>
                <a href={`#/clientes/${cliente.id}`} style={{ fontSize: 12.5 }}>
                  Ver ficha
                </a>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--color-neutral-400)' }}>
                <i className="ph ph-map-pin" style={{ marginTop: 2 }} />
                {endereco ?? '—'}
              </div>
            </div>
            {mensagem}
            <Historico ordem={ordem} />
          </div>
        </div>
      </div>

      {dialogo?.tipo === 'resposta' && (
        <DialogoResposta ordem={ordem} situacaoInicial={dialogo.situacao} onFechar={() => setDialogo(null)} atualizar={atualizar} />
      )}
      {dialogo?.tipo === 'entrega' && <DialogoEntrega ordem={ordem} onFechar={() => setDialogo(null)} atualizar={atualizar} />}
    </Layout>
  )
}
