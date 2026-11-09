import { useCallback, useEffect, useRef, useState } from 'react'
import { AcessoCentral, CartaoAcesso } from '../components/AcessoLayout'
import ErroCampo from '../components/ErroCampo'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { data, diaMesHora, moeda, nomeEquipamento } from '../data/formato'
import { corStatus, iconeEquipamento } from '../data/status'
import { acompanharOrdem, responderOrcamentoCliente } from '../services/ordens'

const SITUACAO = { pendente: 'aguardando sua resposta', aprovado: 'aprovado', recusado: 'recusado' }

// Área do cliente, sem login: andamento da OS pelo número recebido no WhatsApp (perfil Cliente).
// A API não devolve telefone, endereço nem anotações internas do técnico.
// Com o `codigo` do link do WhatsApp, o cliente também aprova ou recusa o orçamento por aqui.
export default function Acompanhar({ numeroInicial = '', codigo = '' }) {
  const [numero, setNumero] = useState(numeroInicial)
  const [os, setOs] = useState(null)
  const [erro, setErro] = useState('')
  const [buscando, setBuscando] = useState(Boolean(numeroInicial))

  useEffect(() => {
    if (!numeroInicial) return
    let ativo = true
    acompanharOrdem(numeroInicial)
      .then((dados) => ativo && setOs(dados))
      .catch((e) => {
        if (!ativo) return
        if (e.status === 404) setErro('Não encontramos uma OS com esse número. Confira o número enviado pela assistência.')
        else if (e.status === 429) setErro('Muitas consultas seguidas. Aguarde um minuto e tente de novo.')
        else setErro(e.message)
      })
      .finally(() => ativo && setBuscando(false))
    return () => {
      ativo = false
    }
  }, [numeroInicial])

  function consultar(e) {
    e.preventDefault()
    if (!numero.trim()) return setErro('Informe o número da OS.')
    // A URL guarda o número: o cliente pode salvar o link e voltar depois.
    navegar(`/acompanhar/${encodeURIComponent(numero.trim().toUpperCase())}`)
  }

  return (
    <AcessoCentral>
      <CartaoAcesso largura={520}>
        <form onSubmit={consultar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>Acompanhar reparo</h1>
            <div className="pagina-subtitulo" style={{ marginTop: 4 }}>
              Digite o número da OS que você recebeu da assistência
            </div>
          </div>
          <div className="field">
            <label htmlFor="a-numero">Número da OS</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="a-numero"
                className={`input mono${erro ? ' input-erro' : ''}`}
                placeholder="OS-20261108-ABCDE"
                autoFocus={!numeroInicial}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                aria-describedby={erro ? 'a-erro' : undefined}
              />
              <button type="submit" className="btn btn-primary" disabled={buscando}>
                <i className="ph ph-magnifying-glass" />
                {buscando ? 'Buscando…' : 'Consultar'}
              </button>
            </div>
            <div id="a-erro" role="alert">
              <ErroCampo erros={erro ? [erro] : null} />
            </div>
          </div>
        </form>

        {os && <Andamento os={os} codigo={codigo} onResposta={setOs} />}

        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)', textAlign: 'center' }}>
          É técnico? <a href="#/entrar">Entrar na sua conta</a>
        </div>
      </CartaoAcesso>
    </AcessoCentral>
  )
}

function Andamento({ os, codigo, onResposta }) {
  const { orcamento } = os
  const [respondido, setRespondido] = useState('')
  const aguardando = os.status === 'aguardando_aprovacao' && orcamento?.situacao === 'pendente'
  return (
    <section aria-label={`Andamento da OS ${os.numero}`} style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--color-neutral-800)', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="icone-quadro" style={{ fontSize: 22 }} aria-hidden="true">
          <i className={`ph ${iconeEquipamento(os.equipamento.tipo)}`} />
        </span>
        <div style={{ flex: 1, lineHeight: 1.35 }}>
          <div style={{ fontWeight: 500 }}>{nomeEquipamento(os.equipamento)}</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>
            {os.assistencia} · <span className="mono">{os.numero}</span> · aberta em {data(os.data_abertura)}
          </div>
        </div>
        <Pill status={os.status} />
      </div>

      <div className="nota" style={{ alignItems: 'center' }}>
        <i className="ph ph-info" style={{ color: 'var(--color-accent-300)' }} />
        <span>
          {os.status === 'entregue'
            ? `Equipamento entregue em ${data(os.data_entrega)}.`
            : `Status atual desde ${diaMesHora(os.data_status).replace(' ', ' às ')}.${os.proximos.length ? ` Próxima etapa: ${os.proximos.join(' ou ')}.` : ''}`}
        </span>
      </div>

      {orcamento && (
        <div className="painel painel-pad" style={{ gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 500 }}>Orçamento</span>
            <span style={{ fontSize: 20, fontWeight: 500 }}>{moeda(orcamento.valor_total)}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
            Situação: {SITUACAO[orcamento.situacao] ?? orcamento.situacao}
            {orcamento.situacao === 'pendente' && orcamento.validade_ate && ` · válido até ${data(`${orcamento.validade_ate}T12:00`)}`}
            {orcamento.prazo_entrega && os.status !== 'entregue' && ` · previsão de entrega ${data(`${orcamento.prazo_entrega}T12:00`)}`}
          </div>
          {orcamento.itens?.length > 0 && (
            <ul aria-label="Itens do orçamento" style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {orcamento.itens.map((i, k) => (
                <li key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span style={{ color: 'var(--color-neutral-400)' }}>
                    {i.tipo === 'peca' ? 'Peça' : 'Serviço'} · {i.descricao}
                    {i.quantidade > 1 && ` ×${i.quantidade}`}
                  </span>
                  <span>{moeda(i.quantidade * i.valor_unitario)}</span>
                </li>
              ))}
            </ul>
          )}
          {aguardando && orcamento.prazo_dias && (
            <div style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
              Prazo do reparo: {orcamento.prazo_dias} {orcamento.prazo_dias === 1 ? 'dia útil' : 'dias úteis'} após a aprovação.
            </div>
          )}
          {aguardando && <RespostaOrcamento os={os} codigo={codigo} onResposta={(nova, texto) => (setRespondido(texto), onResposta(nova))} />}
        </div>
      )}

      <div role="status">
        {respondido && (
          <div className="nota" style={{ alignItems: 'center' }}>
            <i className="ph ph-check-circle" style={{ color: 'var(--color-accent-300)' }} aria-hidden="true" />
            <span>{respondido}</span>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Histórico</div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {os.historico.map((h, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: corStatus(h.status) }} />
              <span style={{ flex: 1 }}>{h.status_rotulo}</span>
              <span style={{ color: 'var(--color-neutral-500)', fontVariantNumeric: 'tabular-nums' }}>{diaMesHora(h.data_hora)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// Botões de aprovar e recusar, cada um com confirmação. Sem o código do link, só explica como responder.
function RespostaOrcamento({ os, codigo, onResposta }) {
  const { orcamento } = os
  const [confirmando, setConfirmando] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const refBotoes = useRef(null)

  const fechar = useCallback(() => {
    setConfirmando(null)
    // Devolve o foco para os botões ao fechar a confirmação.
    requestAnimationFrame(() => refBotoes.current?.querySelector('button')?.focus())
  }, [])

  if (!codigo)
    return (
      <div className="nota" style={{ alignItems: 'center', marginTop: 4 }}>
        <i className="ph ph-whatsapp-logo" style={{ color: 'var(--color-accent-300)' }} aria-hidden="true" />
        <span>Para aprovar ou recusar o orçamento por aqui, abra o link que a assistência enviou pelo WhatsApp.</span>
      </div>
    )

  async function confirmar() {
    const aprovado = confirmando === 'aprovar'
    setEnviando(true)
    setErro('')
    try {
      const nova = await responderOrcamentoCliente(os.numero, codigo, aprovado)
      setConfirmando(null)
      onResposta(
        nova,
        aprovado
          ? 'Orçamento aprovado. A resposta já aparece para a assistência, que vai começar o reparo.'
          : 'Orçamento recusado. A assistência vai combinar com você a devolução do equipamento, sem reparo.',
      )
    } catch (e) {
      setConfirmando(null)
      setErro(e.status === 429 ? 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.' : e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--color-neutral-800)' }}>
      {orcamento.vencido && (
        <div className="aviso aviso-atencao">
          <i className="ph ph-warning" style={{ fontSize: 18 }} aria-hidden="true" />
          <span>
            Este orçamento venceu em {data(`${orcamento.validade_ate}T12:00`)}. Para aprovar, fale com a assistência e confirme os valores. Você ainda pode
            recusá-lo por aqui.
          </span>
        </div>
      )}
      <div ref={refBotoes} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-perigo" onClick={() => setConfirmando('recusar')}>
          <i className="ph ph-x" aria-hidden="true" />
          Recusar
        </button>
        <button type="button" className="btn btn-primary" disabled={orcamento.vencido} onClick={() => setConfirmando('aprovar')}>
          <i className="ph ph-check" aria-hidden="true" />
          Aprovar orçamento
        </button>
      </div>
      <div role="alert">
        <ErroCampo erros={erro ? [erro] : null} />
      </div>
      {confirmando && <Confirmacao os={os} aprovar={confirmando === 'aprovar'} enviando={enviando} onConfirmar={confirmar} onFechar={fechar} />}
    </div>
  )
}

function Confirmacao({ os, aprovar, enviando, onConfirmar, onFechar }) {
  const refConfirmar = useRef(null)
  const { orcamento } = os

  // Foco no botão de confirmar ao abrir; Esc fecha.
  useEffect(() => {
    refConfirmar.current?.focus()
    const tecla = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onFechar])

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="dialog" style={{ width: 440 }} role="dialog" aria-modal="true" aria-labelledby="rc-titulo" aria-describedby="rc-texto">
        <span className="dialog-title" id="rc-titulo">
          {aprovar ? 'Aprovar o orçamento?' : 'Recusar o orçamento?'}
        </span>
        <p id="rc-texto" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-neutral-300)' }}>
          {aprovar
            ? `Você autoriza o reparo do ${os.equipamento.modelo} por ${moeda(orcamento.valor_total)}, com prazo de ${orcamento.prazo_dias} ${orcamento.prazo_dias === 1 ? 'dia útil' : 'dias úteis'} a partir de agora.`
            : `O ${os.equipamento.modelo} não será consertado e ficará disponível para devolução.`}{' '}
          A resposta fica registrada no histórico da OS e não pode ser desfeita por aqui.
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={enviando}>
            Voltar
          </button>
          <button
            type="button"
            ref={refConfirmar}
            className={`btn ${aprovar ? 'btn-primary' : 'btn-secondary btn-perigo'}`}
            disabled={enviando}
            onClick={onConfirmar}
          >
            <i className={`ph ${aprovar ? 'ph-check' : 'ph-x'}`} aria-hidden="true" />
            {enviando ? 'Enviando…' : aprovar ? 'Sim, aprovar' : 'Sim, recusar'}
          </button>
        </div>
      </div>
    </div>
  )
}
