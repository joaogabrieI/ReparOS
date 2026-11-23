import { useEffect, useState } from 'react'
import { AcessoCentral, CartaoAcesso } from '../components/AcessoLayout'
import ErroCampo from '../components/ErroCampo'
import Pill from '../components/Pill'
import { navegar } from '../components/roteador'
import { data, dataHora, diaMesHora, moeda, nomeEquipamento, textoGarantia } from '../data/formato'
import { corStatus, iconeEquipamento, infoDevolucao } from '../data/status'
import { acompanharOrdem } from '../services/ordens'

// Etapas em que o cliente já precisa saber se retira o equipamento ou se recebe em casa.
const MOSTRA_DEVOLUCAO = ['em_reparo', 'pronto_para_retirada', 'orcamento_recusado']

const SITUACAO = { pendente: 'aguardando sua resposta à assistência', aprovado: 'aprovado', recusado: 'recusado' }

// Área do cliente, sem login: andamento da OS pelo número recebido no WhatsApp (perfil Cliente).
// A API não devolve telefone, endereço nem anotações internas do técnico.
// A tela é só para consulta: o cliente responde ao orçamento direto com a assistência.
export default function Acompanhar({ numeroInicial = '' }) {
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

        {os && <Andamento os={os} />}

        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)', textAlign: 'center' }}>
          É técnico? <a href="#/entrar">Entrar na sua conta</a>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)', textAlign: 'center' }}>
          Seus dados são usados só para o atendimento. <a href="#/privacidade">Política de privacidade</a>
        </div>
      </CartaoAcesso>
    </AcessoCentral>
  )
}

function Andamento({ os }) {
  const { orcamento } = os
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
        <Pill status={os.status} rotulo={os.status_rotulo} />
      </div>

      <div className="nota" style={{ alignItems: 'center' }}>
        <i className="ph ph-info" style={{ color: 'var(--color-accent-300)' }} />
        <span>
          {os.status === 'entregue'
            ? `Equipamento entregue${os.forma_devolucao === 'entrega' ? ' no seu endereço' : ''} em ${data(os.data_entrega)}.`
            : `Status atual desde ${diaMesHora(os.data_status).replace(' ', ' às ')}.${os.proximos.length ? ` Próxima etapa: ${os.proximos.join(' ou ')}.` : ''}`}
        </span>
      </div>

      {os.garantia && (
        <div className="nota" style={{ alignItems: 'center' }}>
          <i className="ph ph-shield-check" style={{ color: 'var(--color-accent-300)' }} aria-hidden="true" />
          <span>
            {textoGarantia(os.garantia)}
            {os.garantia.ativa && ' Se o defeito voltar, fale com a assistência informando o número da OS.'}
          </span>
        </div>
      )}

      {MOSTRA_DEVOLUCAO.includes(os.status) && (
        <div className="nota" style={{ alignItems: 'center' }}>
          <i className={`ph ${infoDevolucao(os.forma_devolucao).icone}`} style={{ color: 'var(--color-accent-300)' }} />
          <span>
            {os.forma_devolucao === 'entrega'
              ? `A assistência vai entregar o equipamento no seu endereço${os.entrega_agendada ? `, em ${dataHora(os.entrega_agendada).replace(' ', ' às ')}` : '. O horário será combinado pelo WhatsApp'}.`
              : 'Você retira o equipamento na assistência.'}
          </span>
        </div>
      )}

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
          {aguardando && (
            <div className="nota" style={{ alignItems: 'center' }}>
              <i className="ph ph-chat-circle-text" style={{ color: 'var(--color-accent-300)' }} aria-hidden="true" />
              <span>Para aprovar ou recusar o orçamento, responda à assistência pelo WhatsApp ou telefone.</span>
            </div>
          )}
        </div>
      )}

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
