// Textos dos Termos de uso e da Política de privacidade do ReparOS.
// Ao mudar um texto, suba a versão aqui E em backend/config/termos.php: o backend só aceita
// a versão em vigor, e todos os usuários terão de aceitar de novo no próximo acesso.

export const VERSAO_TERMOS = '1.0'
export const VERSAO_PRIVACIDADE = '1.0'
export const VIGENCIA = '23/11/2026'

// Canal para o titular dos dados e para os usuários (LGPD art. 41). Endereço de exemplo do projeto.
export const CONTATO_PRIVACIDADE = 'privacidade@reparos.app'

// Corpo do pedido de aceite enviado ao backend (cadastro e primeiro acesso).
export const ACEITE_ATUAL = { aceite_termos: true, versao_termos: VERSAO_TERMOS, versao_privacidade: VERSAO_PRIVACIDADE }

export const TERMOS_USO = {
  titulo: 'Termos de uso',
  versao: VERSAO_TERMOS,
  introducao:
    'Estes Termos de uso regulam o uso do ReparOS, sistema web para assistências técnicas organizarem clientes, equipamentos, ordens de serviço (OS) e a comunicação com o cliente. Ao criar a conta da assistência ou entrar pela primeira vez com um acesso criado pelo administrador, você declara que leu e aceita estes termos e a Política de privacidade.',
  secoes: [
    {
      titulo: '1. Quem usa o ReparOS',
      paragrafos: [
        'O ReparOS é contratado pela assistência técnica. Cada assistência tem uma conta, com um ou mais usuários: administradores, que gerenciam a equipe e as configurações, e técnicos, que atendem as OS.',
        'O cliente da assistência não tem conta. Ele acompanha o reparo pelo número da OS e responde ao orçamento pelo link que recebe no WhatsApp.',
      ],
    },
    {
      titulo: '2. Conta e acesso',
      itens: [
        'Quem cria a conta deve ter pelo menos 18 anos, informar dados verdadeiros e ter autorização para representar a assistência.',
        'O primeiro usuário da conta é administrador. Ele cria os acessos da equipe, e cada pessoa aceita estes termos no próprio primeiro acesso.',
        'Cada acesso é pessoal. Não compartilhe a senha; ela deve ter pelo menos 8 caracteres, com letra, número e caractere especial.',
        'Por segurança, a sessão expira após 30 minutos sem uso, e o login é bloqueado por um minuto após 5 tentativas erradas.',
        'O administrador pode desativar um acesso a qualquer momento. O usuário desativado perde o acesso na hora, mas o que ele fez continua registrado com o nome dele.',
      ],
    },
    {
      titulo: '3. Uso permitido',
      paragrafos: ['O ReparOS deve ser usado apenas para a gestão dos atendimentos da assistência. Não é permitido:'],
      itens: [
        'cadastrar dados de pessoas sem relação com um atendimento ou guardar dados sensíveis (saúde, religião, biometria e outros do art. 5º, II, da LGPD);',
        'enviar pelo sistema propaganda ou mensagens que o cliente não pediu;',
        'tentar acessar dados de outra assistência, burlar o login ou sobrecarregar o sistema;',
        'usar o ReparOS para qualquer atividade ilegal.',
      ],
    },
    {
      titulo: '4. Responsabilidades da assistência',
      paragrafos: [
        'Em relação aos dados dos seus clientes, a assistência é a controladora e o ReparOS é o operador, que trata os dados em nome dela e segundo as instruções dela (LGPD, art. 5º, VI e VII, e art. 39).',
        'A assistência é responsável por informar seus clientes sobre o uso dos dados, manter os cadastros corretos, atender aos pedidos dos clientes sobre seus dados e cumprir o Código de Defesa do Consumidor no orçamento, no reparo e na garantia.',
      ],
    },
    {
      titulo: '5. Mensagens pelo WhatsApp',
      paragrafos: [
        'O botão "Enviar WhatsApp" abre uma conversa com a mensagem pronta; quem envia é o técnico, pela conta de WhatsApp da assistência. O uso do WhatsApp segue os termos da Meta, e a assistência responde pelas mensagens que envia.',
      ],
    },
    {
      titulo: '6. Disponibilidade e cópias de segurança',
      paragrafos: [
        'O ReparOS busca ficar disponível o tempo todo, mas pode passar por manutenções e falhas fora do seu controle. É feita uma cópia de segurança diária dos dados, guardada por 30 dias.',
      ],
    },
    {
      titulo: '7. Plano e pagamento',
      paragrafos: [
        'O ReparOS é oferecido por assinatura mensal por assistência. Os recursos e o valor do plano são informados na contratação, e qualquer mudança de valor é avisada com antecedência.',
      ],
    },
    {
      titulo: '8. Cancelamento e seus dados',
      paragrafos: [
        'A assistência pode cancelar a assinatura quando quiser. Antes do cancelamento, o administrador pode exportar os dados da assistência e pedir a exclusão definitiva deles, ressalvados os registros que a lei manda guardar, como os registros de acesso por 6 meses (Marco Civil da Internet, art. 15).',
      ],
    },
    {
      titulo: '9. Propriedade intelectual',
      paragrafos: [
        'O sistema, a marca e o visual do ReparOS pertencem aos seus criadores. Os dados cadastrados pertencem à assistência e aos titulares desses dados.',
      ],
    },
    {
      titulo: '10. Mudanças nestes termos',
      paragrafos: [
        'Estes termos podem ser atualizados. Cada versão tem número e data; quando houver uma nova versão, o sistema pede um novo aceite no próximo acesso, e o histórico dos aceites fica guardado.',
      ],
    },
    {
      titulo: '11. Lei aplicável e contato',
      paragrafos: [
        `Estes termos seguem as leis do Brasil, em especial o Marco Civil da Internet (Lei nº 12.965/2014), a LGPD (Lei nº 13.709/2018) e o Código de Defesa do Consumidor (Lei nº 8.078/1990), quando aplicável. Dúvidas: ${CONTATO_PRIVACIDADE}.`,
      ],
    },
  ],
}

export const POLITICA_PRIVACIDADE = {
  titulo: 'Política de privacidade',
  versao: VERSAO_PRIVACIDADE,
  introducao:
    'Esta política explica quais dados o ReparOS guarda, para quê, por quanto tempo e como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e o Marco Civil da Internet (Lei nº 12.965/2014). Ela vale para os usuários das assistências e para os clientes atendidos por elas.',
  secoes: [
    {
      titulo: '1. Quem é o responsável',
      itens: [
        'Dados dos usuários (equipe da assistência): o ReparOS é o controlador.',
        'Dados dos clientes da assistência: a assistência é a controladora e o ReparOS é o operador, que trata os dados em nome dela. Pedidos do cliente podem ser feitos diretamente à assistência ou pelo contato desta política, que os repassa a ela.',
      ],
    },
    {
      titulo: '2. Quais dados guardamos',
      itens: [
        'Da assistência: nome e telefone (WhatsApp) da loja.',
        'Dos usuários: nome, e-mail, senha (guardada só em forma criptografada, com bcrypt), perfil, data e hora dos acessos e o aceite destes documentos (versão, data e hora, endereço IP e navegador).',
        'Registro de atividade: quem fez cada ação no sistema, quando, a partir de qual endereço IP e o que mudou.',
        'Dos clientes: nome, telefone de WhatsApp, endereço para retirada e entrega, equipamentos (tipo, marca, modelo, número de série) e as OS, com problema relatado, diagnóstico, orçamento, aprovação ou recusa e histórico de status.',
      ],
      paragrafos: ['O ReparOS não pede CPF nem guarda dados sensíveis.'],
    },
    {
      titulo: '3. Para que usamos e com qual base legal',
      itens: [
        'Prestar o serviço de reparo e manter o histórico da OS: execução de contrato a pedido do titular (art. 7º, V).',
        'Avisar o cliente sobre o andamento e o orçamento pelo WhatsApp: execução de contrato (art. 7º, V). Os dados nunca são usados para propaganda.',
        'Guardar os registros de acesso por 6 meses: cumprimento de obrigação legal (art. 7º, II; Marco Civil, art. 15).',
        'Guardar as OS pelo prazo da garantia e para defesa da assistência: exercício regular de direitos (art. 7º, VI; CDC, art. 26).',
        'Registro de atividade, limite de tentativas de login e prova do aceite: legítimo interesse em manter o sistema seguro (art. 7º, IX).',
      ],
    },
    {
      titulo: '4. Com quem compartilhamos',
      paragrafos: [
        'Os dados não são vendidos nem cedidos. Cada assistência vê apenas os dados dela. Os dados ficam no servidor de hospedagem contratado pelo ReparOS. As mensagens ao cliente são enviadas pelo técnico, pelo WhatsApp da assistência, e seguem a política de privacidade da Meta. Podemos fornecer dados a autoridades quando houver ordem judicial ou obrigação legal.',
      ],
    },
    {
      titulo: '5. Por quanto tempo guardamos',
      itens: [
        'Dados da conta e dos usuários: enquanto a assinatura estiver ativa. Usuários desativados ficam guardados para manter a autoria do registro de atividade.',
        'Registros de acesso: 6 meses, depois apagados.',
        'OS encerradas: pelo prazo necessário para a garantia e a defesa da assistência; depois disso, os dados pessoais do cliente podem ser anonimizados, mantendo só os dados do serviço.',
        'Cópias de segurança: 30 dias.',
        'Aceites destes documentos: enquanto a conta existir, como prova do consentimento.',
      ],
    },
    {
      titulo: '6. Como protegemos',
      itens: [
        'Conexão protegida por HTTPS e senhas guardadas com bcrypt.',
        'Login com limite de 5 tentativas por minuto e sessão que expira após 30 minutos sem uso.',
        'Cada usuário só vê os dados da própria assistência; o histórico da OS e o registro de atividade não podem ser alterados nem apagados.',
        'Cópia de segurança diária e procedimento de resposta a incidentes: se houver um incidente que possa causar risco ou dano relevante, as assistências afetadas, a ANPD e os titulares são avisados (art. 48).',
      ],
    },
    {
      titulo: '7. Seus direitos',
      paragrafos: ['Pelo art. 18 da LGPD, você pode pedir, a qualquer momento:'],
      itens: [
        'confirmação de que tratamos seus dados e acesso a eles;',
        'correção de dados incompletos, inexatos ou desatualizados;',
        'anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;',
        'portabilidade dos dados e informação sobre com quem eles foram compartilhados;',
        'revisão do consentimento, quando ele for a base do tratamento.',
      ],
    },
    {
      titulo: '8. Cookies e armazenamento no navegador',
      paragrafos: [
        'O ReparOS não usa cookies de propaganda nem de rastreamento. O navegador guarda apenas o token de acesso, para manter você conectado; ele é apagado ao sair do sistema.',
      ],
    },
    {
      titulo: '9. Contato e mudanças',
      paragrafos: [
        `Para dúvidas ou para exercer seus direitos, escreva para ${CONTATO_PRIVACIDADE}. Clientes também podem falar diretamente com a assistência que os atendeu. Esta política pode ser atualizada; cada versão tem número e data, e os usuários aceitam a nova versão no próximo acesso.`,
      ],
    },
  ],
}
