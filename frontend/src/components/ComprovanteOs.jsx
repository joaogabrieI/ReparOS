import { dataHora, nomeEquipamento, telefone } from '../data/formato'
import { infoDevolucao } from '../data/status'

// Comprovante de entrada da OS (via do cliente): só aparece na impressão (index.css, @media print).
// O botão Imprimir da DetalheOs imprime este comprovante no lugar da tela, em folha A4 branca.
// Dados da assistência vêm do usuário logado (/eu traz a assistência com nome e telefone).
function Campo({ rotulo, children, largo }) {
  return (
    <div className={`comprovante-campo${largo ? ' largo' : ''}`}>
      <span className="comprovante-rotulo">{rotulo}</span>
      <span>{children || '—'}</span>
    </div>
  )
}

export default function ComprovanteOs({ ordem, assistencia, endereco }) {
  const { cliente, equipamento } = ordem
  const linkAcompanhar = `${window.location.origin}${window.location.pathname}#/acompanhar/${encodeURIComponent(ordem.numero)}`
  const entrada = ordem.data_retirada
    ? dataHora(ordem.data_retirada)
    : ordem.retirada_agendada
      ? `retirada combinada para ${dataHora(ordem.retirada_agendada)}`
      : 'aguardando a retirada'

  return (
    <section className="comprovante so-impressao" aria-label="Comprovante de entrada para impressão">
      <header className="comprovante-topo">
        <div>
          <div className="comprovante-assistencia">{assistencia?.nome ?? 'Assistência técnica'}</div>
          {assistencia?.telefone && <div>Telefone / WhatsApp {telefone(assistencia.telefone)}</div>}
        </div>
        <div className="comprovante-numero">
          <div className="comprovante-rotulo">Ordem de serviço</div>
          <div className="comprovante-os">{ordem.numero}</div>
          <div>Aberta em {dataHora(ordem.data_abertura)}</div>
        </div>
      </header>

      <h2 className="comprovante-titulo">Comprovante de entrada de equipamento</h2>

      <div className="comprovante-bloco">
        <h3>Cliente</h3>
        <div className="comprovante-grade">
          <Campo rotulo="Nome">{cliente.nome}</Campo>
          <Campo rotulo="WhatsApp">{telefone(cliente.telefone_whatsapp)}</Campo>
          <Campo rotulo="Endereço" largo>
            {endereco}
          </Campo>
        </div>
      </div>

      <div className="comprovante-bloco">
        <h3>Equipamento</h3>
        <div className="comprovante-grade">
          <Campo rotulo="Tipo">{equipamento.tipo}</Campo>
          <Campo rotulo="Marca e modelo">{nomeEquipamento(equipamento)}</Campo>
          <Campo rotulo="Nº de série / IMEI">{equipamento.numero_serie}</Campo>
          <Campo rotulo="Entrada na assistência">{entrada}</Campo>
          <Campo rotulo="Técnico responsável">{ordem.responsavel?.nome}</Campo>
          <Campo rotulo="Devolução">{infoDevolucao(ordem.forma_devolucao).descricao}</Campo>
        </div>
      </div>

      <div className="comprovante-bloco">
        <h3>Problema relatado pelo cliente</h3>
        <p className="comprovante-texto">{ordem.problema_relatado}</p>
        <div className="comprovante-linhas" aria-hidden="true">
          <span>Estado do aparelho e acessórios entregues:</span>
          <span />
          <span />
        </div>
      </div>

      <div className="comprovante-bloco">
        <h3>Condições</h3>
        <ol className="comprovante-condicoes">
          <li>O diagnóstico e o orçamento são enviados pelo WhatsApp. Nenhum reparo é feito sem a aprovação do cliente.</li>
          <li>Se o orçamento for recusado, o equipamento é devolvido sem reparo.</li>
          <li>O serviço realizado tem garantia legal de 90 dias a partir da entrega (Código de Defesa do Consumidor, art. 26, II).</li>
          <li>Recomendamos fazer cópia dos dados antes do reparo. Guarde este comprovante para a devolução do equipamento.</li>
        </ol>
        <p className="comprovante-texto">
          Acompanhe o reparo pelo número da OS em <span className="comprovante-link">{linkAcompanhar}</span>
        </p>
      </div>

      <div className="comprovante-assinaturas">
        <div>
          <span className="comprovante-traco" />
          {cliente.nome}
          <br />
          Cliente
        </div>
        <div>
          <span className="comprovante-traco" />
          {ordem.responsavel?.nome ?? ''}
          <br />
          {assistencia?.nome ?? 'Assistência técnica'}
        </div>
      </div>
      <div className="comprovante-data">Data: ____/____/________</div>

      <footer className="comprovante-rodape">Emitido pelo ReparOS</footer>
    </section>
  )
}
