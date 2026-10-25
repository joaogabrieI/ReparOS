import { pecasDoOrcamento } from './regras'
import { FLUXO } from './status'

// Dados de exemplo usados enquanto a API de clientes e OS não existe.
// As datas são relativas a hoje para que "na etapa há" faça sentido.

function diasAtras(dias, hora = 10, minuto = 0) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

// Técnico mostrado na barra lateral e na saudação do Início.
export const tecnico = { nome: 'Marcos Teixeira', nome_assistencia: 'Mtec Reparos' }

export const clientes = [
  { id: 1, nome: 'Bruno Filho', telefone_whatsapp: '(11) 98383-0479', endereco: 'Av. Celso Garcia, 2100 — Belém, São Paulo' },
  { id: 2, nome: 'Daniel Lima', telefone_whatsapp: '(11) 97757-5522', endereco: 'Rua Tuiuti, 1200 — Tatuapé, São Paulo' },
  { id: 3, nome: 'Jojo Cucu', telefone_whatsapp: '(11) 96074-0018', endereco: 'Rua Serra de Bragança, 88 — Vila Gomes Cardim' },
  { id: 4, nome: 'Kevelin Souza', telefone_whatsapp: '(11) 94349-0675', endereco: 'Rua Emília Marengo, 410 — Jardim Anália Franco' },
  { id: 5, nome: 'Lucas Prado', telefone_whatsapp: '(11) 99120-3341', endereco: 'Rua Apucarana, 77 — Tatuapé' },
  { id: 6, nome: 'Madalena Reis', telefone_whatsapp: '(11) 98580-0143', endereco: 'Rua Azevedo Soares, 1500 — Vila Gomes Cardim' },
  { id: 7, nome: 'Magda Ferreira', telefone_whatsapp: '(11) 96653-2462', endereco: 'Rua Itapura, 455, ap. 32 — Tatuapé' },
  { id: 8, nome: 'Oliveira Neto', telefone_whatsapp: '(11) 97610-4120', endereco: 'Rua Padre Estevão Pernet, 300 — Tatuapé' },
  { id: 9, nome: 'Renata Santos', telefone_whatsapp: '(11) 98877-1209', endereco: 'Rua Cantagalo, 900 — Tatuapé' },
  { id: 10, nome: 'Aurelio Matos', telefone_whatsapp: '(11) 97750-6482', endereco: 'Rua Coelho Lisboa, 120 — Cidade Mãe do Céu' },
]

export const equipamentos = [
  { id: 1, cliente_id: 1, tipo: 'Smartphone', marca: 'Apple', modelo: 'iPhone 13', numero_serie: 'F2LXK7Q1P0' },
  { id: 2, cliente_id: 1, tipo: 'Controle de videogame', marca: 'Sony', modelo: 'Controle DualShock 4', numero_serie: 'CUH-ZCT2U-81' },
  { id: 3, cliente_id: 2, tipo: 'Videogame', marca: 'Sony', modelo: 'PlayStation 5', numero_serie: 'CFI-1214A' },
  { id: 4, cliente_id: 2, tipo: 'Smartphone', marca: 'Xiaomi', modelo: 'Redmi Note 12', numero_serie: '' },
  { id: 5, cliente_id: 3, tipo: 'Notebook', marca: 'Acer', modelo: 'Notebook Acer Nitro', numero_serie: 'NHQ7KAL001' },
  { id: 6, cliente_id: 4, tipo: 'Smartphone', marca: 'Samsung', modelo: 'Galaxy S22', numero_serie: 'R5CT20ABC1' },
  { id: 7, cliente_id: 4, tipo: 'Videogame', marca: 'Microsoft', modelo: 'Xbox Series S', numero_serie: '' },
  { id: 8, cliente_id: 5, tipo: 'Notebook', marca: 'Acer', modelo: 'Notebook Acer Aspire 5', numero_serie: 'NXA5K22019' },
  { id: 9, cliente_id: 6, tipo: 'Tablet', marca: 'Apple', modelo: 'iPad 9ª geração', numero_serie: 'DMPXW2R0Q1' },
  { id: 10, cliente_id: 7, tipo: 'Notebook', marca: 'Dell', modelo: 'Notebook Dell Inspiron 15', numero_serie: '7H2KQ93' },
  { id: 11, cliente_id: 8, tipo: 'Controle de videogame', marca: 'Sony', modelo: 'Controle PS4', numero_serie: '' },
  { id: 12, cliente_id: 9, tipo: 'Videogame', marca: 'Microsoft', modelo: 'Xbox Series S', numero_serie: 'XSS0042817' },
  { id: 13, cliente_id: 10, tipo: 'Smartphone', marca: 'Motorola', modelo: 'Moto G84', numero_serie: '' },
]

// [número, equipamento, status, problema, dias desde a abertura, dias na etapa atual, extras]
const linhas = [
  ['#1043', 6, 'aberta', 'Não carrega, conector com mau contato', 0, 0, { retirada: [-1, 9, 0] }],
  ['#1042', 3, 'aberta', 'Superaquecendo e desligando', 1, 1, { retirada: [0, 16, 0] }],
  ['#1040', 13, 'aguardando_diagnostico', 'Bateria estufada', 2, 1],
  ['#1039', 9, 'diagnostico_realizado', 'Vidro trincado após queda', 2, 0, {
    diagnostico: 'Vidro e touch trincados. Display funcionando normalmente, sem danos na carcaça.',
    servico_necessario: 'Trocar o conjunto de vidro e touch e testar o display.',
  }],
  ['#1038', 10, 'aguardando_aprovacao', 'Notebook muito lento e agora não inicia o Windows, fica na tela de carregamento.', 4, 3, {
    diagnostico: 'HD com setores defeituosos (312 setores realocados no teste SMART). Sistema não conclui a inicialização.',
    servico_necessario: 'Trocar o HD por SSD 480GB e reinstalar o sistema operacional. Recomendada limpeza interna com troca de pasta térmica.',
    orcamento: [[['peca', 'SSD Kingston 480GB', 1, 220], ['peca', 'Pasta térmica', 1, 30], ['servico', 'Instalação do SSD + reinstalação do sistema', 1, 150], ['servico', 'Limpeza interna', 1, 70]], 2],
  }],
  ['#1037', 1, 'em_reparo', 'Tela quebrada, touch falhando', 5, 2, {
    diagnostico: 'Tela frontal quebrada com touch inoperante na parte inferior.',
    orcamento: [[['peca', 'Tela OLED iPhone 13', 1, 890], ['servico', 'Troca de tela', 1, 150]], 2, 'aprovado'],
  }],
  ['#1036', 8, 'aguardando_diagnostico', 'Teclado falhando em várias teclas', 7, 5],
  ['#1035', 12, 'aguardando_aprovacao', 'Sem imagem na saída HDMI', 9, 6, {
    diagnostico: 'Porta HDMI com pinos danificados. Chip retimer sem sinais de queima.',
    orcamento: [[['peca', 'Conector HDMI', 1, 80], ['servico', 'Troca do conector HDMI (microsolda)', 1, 220]], 4],
  }],
  ['#1034', 11, 'pronto_para_retirada', 'Analógico esquerdo com drift', 11, 4, {
    diagnostico: 'Potenciômetro do analógico esquerdo desgastado.',
    orcamento: [[['peca', 'Módulo analógico', 1, 45], ['servico', 'Troca do analógico', 1, 60]], 2, 'aprovado'],
    servico_executado: 'Troca do módulo analógico esquerdo e calibração.',
  }],
  ['#1033', 7, 'entregue', 'Não liga após atualização', 14, 7, {
    diagnostico: 'Fonte interna com capacitor estufado.',
    orcamento: [[['peca', 'Fonte interna', 1, 220], ['servico', 'Troca da fonte', 1, 120]], 3, 'aprovado'],
    servico_executado: 'Troca da fonte interna e limpeza.',
  }],
  ['#1031', 5, 'entregue', 'Desligando em jogos pesados', 18, 11, {
    diagnostico: 'Pasta térmica ressecada e cooler com poeira acumulada.',
    orcamento: [[['servico', 'Limpeza interna e troca de pasta térmica', 1, 180]], 1, 'aprovado'],
    servico_executado: 'Limpeza completa e troca de pasta térmica.',
  }],
  ['#1012', 2, 'entregue', 'Não liga', 55, 50, {
    diagnostico: 'Bateria sem carga e conector flat solto.',
    orcamento: [[['peca', 'Bateria DualShock 4', 1, 70], ['servico', 'Troca de bateria', 1, 40]], 2, 'aprovado'],
    servico_executado: 'Troca de bateria.',
  }],
  ['#0981', 1, 'entregue', 'Bateria descarregando rápido', 236, 230, {
    diagnostico: 'Bateria com 71% de saúde.',
    orcamento: [[['peca', 'Bateria iPhone 13', 1, 320], ['servico', 'Troca de bateria', 1, 80]], 1, 'aprovado'],
    servico_executado: 'Troca de bateria.',
  }],
  ['#0874', 2, 'entregue', 'Botão R2 travando', 166, 160, {
    diagnostico: 'Mola do gatilho R2 quebrada.',
    orcamento: [[['peca', 'Mola do gatilho', 1, 15], ['servico', 'Troca da mola', 1, 40]], 1, 'aprovado'],
    servico_executado: 'Troca da mola do R2.',
  }],
]

function servicosDoOrcamento(orcamento) {
  return (orcamento?.itens ?? []).filter((i) => i.tipo === 'servico').map((i) => i.descricao).join('; ')
}

function montarOrdem([numero, equipamentoId, status, problema, diasAbertura, diasEtapa, extras = {}], id) {
  const etapas = FLUXO.slice(0, FLUXO.indexOf(status) + 1)
  // Espalha as mudanças de status entre a abertura e a etapa atual.
  const historico = etapas.map((s, i) => {
    const dias = i === 0 ? diasAbertura : i === etapas.length - 1 ? diasEtapa : Math.round(diasAbertura - ((diasAbertura - diasEtapa) * i) / (etapas.length - 1))
    return { status_anterior: etapas[i - 1] ?? null, status_novo: s, data_hora: diasAtras(dias, 9 + i, 10 * i) }
  })
  const quando = (s) => historico.find((h) => h.status_novo === s)?.data_hora ?? null
  const [ra = -1, rh = 10, rm = 0] = extras.retirada ?? []

  let orcamento = null
  if (extras.orcamento) {
    const [itens, prazo, situacao = 'pendente'] = extras.orcamento
    orcamento = {
      itens: itens.map(([tipo, descricao, quantidade, valor_unitario]) => ({ tipo, descricao, quantidade, valor_unitario })),
      prazo_entrega: prazo,
      situacao,
      data_envio: quando('orcamento_enviado'),
      data_resposta: situacao === 'pendente' ? null : quando('em_reparo'),
    }
  }

  return {
    id: id + 1,
    numero,
    equipamento_id: equipamentoId,
    status,
    problema_relatado: problema,
    data_abertura: historico[0].data_hora,
    data_status: historico.at(-1).data_hora,
    retirada_agendada: status === 'aberta' ? diasAtras(ra, rh, rm) : diasAtras(diasAbertura - 1, rh, rm),
    retirada_local: '',
    data_retirada: quando('aguardando_diagnostico'),
    diagnostico: extras.diagnostico ?? '',
    servico_necessario: extras.servico_necessario ?? servicosDoOrcamento(orcamento),
    servico_executado: extras.servico_executado ?? '',
    pecas_trocadas: extras.servico_executado ? pecasDoOrcamento(orcamento) : [],
    recebido_por: status === 'entregue' ? '' : null,
    data_entrega: quando('entregue'),
    orcamento,
    historico,
  }
}

export const ordens = linhas.map(montarOrdem)
