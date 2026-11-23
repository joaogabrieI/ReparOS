# ReparOS

Sistema de gestão de ordens de serviço para assistências técnicas.

| Pasta | O que é | Tecnologia |
|---|---|---|
| [`backend/`](backend) | API REST | Laravel 12 (PHP 8.2+), PostgreSQL, Sanctum |
| [`frontend/`](frontend) | Interface web | React 19 + Vite |

O frontend conversa com o backend só pela API (`http://localhost:8000/api`). O CORS do Laravel já libera o endereço do frontend (`FRONTEND_URL` no `.env` do backend). O mesmo `FRONTEND_URL` (o primeiro, se houver vários separados por vírgula) é a base dos links que o backend gera para telas do React: acompanhamento da OS no WhatsApp e nova senha no e-mail. Em produção, aponte para o endereço público do frontend.

Cada conta é uma **assistência** com vários **usuários**. Perfis: **Administrador** (tudo o que o técnico faz e ainda gerencia a equipe, as configurações da assistência e consulta o registro de atividade; pode haver vários), **Técnico** (atende clientes, abre e movimenta OS) e **Cliente** (acompanha a OS sem conta). Todos os usuários de uma assistência veem os mesmos clientes, equipamentos e OS, e cada ação fica registrada com quem fez.

## Como rodar

### 1. Pré-requisitos (uma vez só)

- PHP 8.2+ com as extensões `pdo_pgsql`, `mbstring`, `xml`, `curl` e `zip`
- [Composer](https://getcomposer.org/download/)
- PostgreSQL
- Node 20+

No Ubuntu:

```bash
sudo apt install php8.4-pgsql php8.4-xml php8.4-mbstring php8.4-curl php8.4-zip composer postgresql
```

### 2. Banco de dados

Crie o usuário e o banco `reparos` (senha `reparos`):

```bash
sudo -u postgres psql -c "CREATE USER reparos WITH PASSWORD 'reparos';"
sudo -u postgres psql -c "CREATE DATABASE reparos OWNER reparos;"
```

### 3. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

A API fica em http://localhost:8000. O seed cria a "Assistência Demo" com o admin `tecnico@reparos.test` e a técnica `ana@reparos.test` (os dois com a senha `Senha@123`), um cliente, um equipamento e uma OS de exemplo com a Ana como responsável. O admin já vem com os termos aceitos; a Ana, como todo usuário criado pelo admin, aceita os Termos de uso e a Política de privacidade no primeiro acesso.

Quem já tinha dados no banco só precisa rodar `php artisan migrate`: cada técnico antigo vira uma assistência e o usuário admin dela (mesmo id, mesmo e-mail e senha), clientes passam para a assistência, as OS antigas ficam com ele como responsável e os logins abertos continuam valendo. `php artisan migrate:rollback --step=7` desfaz a mudança.

### 4. Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abra http://localhost:5173 e entre em `#/entrar` com um usuário do seed. Todas as telas da assistência usam a API:

- **Início**, **OS pendentes** e barra lateral: listagem de OS (`/api/ordens-servico`), com as paradas destacadas pelo campo `parada` da API; a busca e o filtro "só paradas" das pendentes vão para a API.
- **Buscar OS**: busca (nº da OS, cliente, telefone, marca ou modelo), tipo, status, técnico responsável (ou "Minhas OS"), período, "só paradas" e ordenação, todos aplicados na API.
- **Abrir OS**: escolhe o cliente (ou cadastra um novo), escolhe ou cadastra o equipamento e abre a OS com o problema, a retirada combinada e o técnico responsável (por padrão, quem abre).
- **Detalhe da OS**: cada etapa chama a rota dela (retirada, diagnóstico, orçamento com rascunho e envio, resposta do cliente com o canal, reparo com peças trocadas, pronto, entrega ou devolução sem reparo) e mostra o histórico devolvido pela API, com quem fez cada mudança. O cartão **Técnico responsável** mostra quem cuida da OS e permite trocar por outro usuário ativo. O botão **Enviar WhatsApp** abre o link `wa.me` montado por `/whatsapp`; enviar o orçamento salva, registra o envio e abre a mensagem com a validade.
- **Clientes**: listagem, busca, ficha, cadastro e edição de clientes e de equipamentos.
- **Equipe** (só admin): configurações da assistência (nome, WhatsApp, dias para OS parada) e usuários: criar, editar, mudar perfil, trocar senha, desativar e reativar.
- **Atividades** (só admin): registro de quem fez cada ação, com filtro por usuário, ação, assunto e período e o antes/depois dos campos alterados.

Os erros de validação (422) aparecem ao lado de cada campo. O cliente acompanha o reparo sem login em `#/acompanhar` (ou `#/acompanhar/<número da OS>`), com link na tela de entrar e em toda mensagem do WhatsApp. Com o orçamento aguardando aprovação, o link do WhatsApp leva também um código (`#/acompanhar/<número>?codigo=...`) e a tela mostra os itens, o prazo e os botões **Aprovar orçamento** e **Recusar**, cada um com confirmação (foco no botão de confirmar, Esc fecha). Orçamento vencido mostra o aviso e só pode ser recusado por ali. No detalhe da OS, **Cobrar resposta** manda o lembrete com o mesmo link. Os Termos de uso e a Política de privacidade ficam em `#/termos` e `#/privacidade` (públicos, com link no cadastro, na tela de aceite, na barra lateral e na tela do cliente). Cadastro e recuperação de senha ficam em `#/cadastro` e `#/esqueci-senha` e também usam a API: o cadastro já entra na conta criada, e o link de nova senha (enviado para o log em `storage/logs/laravel.log`, já que `MAIL_MAILER=log`) abre `#/nova-senha?token=...&email=...`. Depois de 30 minutos sem uso a sessão expira e a tela de entrar avisa.

## Estrutura

```
backend/
  app/Enums/           Status da OS (9), situação do orçamento, tipo de item, perfil do usuário
  app/Models/          Assistencia, Usuario, Cliente, Equipamento, OrdemServico, Orcamento, ItemOrcamento, HistoricoStatus, RegistroAtividade
  app/Models/Concerns  RegistraAtividade (criado_por_id e registro de criação e alteração)
  app/Support/         Auditoria (grava o registro de atividade), mensagens do WhatsApp, links do frontend
  app/Http/Controllers StatusController (saúde da API), AuthController (login), UsuarioController, AssistenciaController, AtividadeController, ClienteController, EquipamentoController, OS
  app/Http/Requests    Validação dos dados do cliente e do equipamento
  config/cors.php      Liberação do frontend
  database/migrations  Tabelas do modelo de dados
  database/seeders     Dados de exemplo
  routes/api.php       Rotas da API
frontend/
  src/services/        Cliente HTTP para a API (token do login) e chamadas de clientes, equipamentos e OS
  src/pages/           Telas (login, cadastro, termos e privacidade, aceite dos termos, senha, Início, OS pendentes, Buscar OS, Abrir OS, Detalhe da OS, Clientes, Equipe, Atividades, Acompanhar)
  src/components/      Componentes reutilizáveis (barra lateral, diálogos, etiqueta de status)
  src/styles/          Design system Nocturne, copiado do projeto de design
  src/data/            Status da OS, dados compartilhados das telas (store), formatação, prévia do orçamento e textos dos termos (termos.js)
```

## Modelo de dados

As migrations seguem o MER (`modelo-dados/MER_ReparOS.drawio`), com os nomes no padrão do Laravel:

| DER | Banco |
|---|---|
| `id_assistencia`, `id_cliente`... | `id` em cada tabela; chaves estrangeiras como `assistencia_id`, `cliente_id`, `ordem_servico_id` |
| `criado_por`, `responsavel` | `criado_por_id`, `responsavel_id` (apontam para `usuarios`) |
| `senha_hash` | `password` (o Laravel guarda o hash) |
| `data_cadastro` | `created_at` |
| Ordem de serviço | tabela `ordens_servico` |
| Item do orçamento | tabela `itens_orcamento` |
| Histórico de status | tabela `historico_status` |
| Registro de atividade | tabela `registros_atividade` |
| Aceite de termos | tabela `aceites_termos` |

Regras garantidas pelo banco:

- `status` da OS aceita só os 9 valores: aberta, aguardando_diagnostico, diagnostico_realizado, orcamento_enviado, aguardando_aprovacao, orcamento_recusado, em_reparo, pronto_para_retirada, entregue.
- Cada OS tem no máximo um orçamento (`ordem_servico_id` único em `orcamentos`).
- O WhatsApp do cliente é único dentro de cada assistência, para que duas assistências possam atender o mesmo cliente. A API guarda só DDD e número (`11988887777`), então `(11) 98888-7777` e `+55 11 98888-7777` contam como o mesmo telefone.
- `forma_devolucao` da OS aceita só `retirada` (padrão: o cliente retira na assistência) ou `entrega` (no endereço do cliente, com `endereco_entrega` e `entrega_agendada`).
- Toda OS nasce como "Aberta" com número próprio, e `OrdemServico::mudarStatus()` troca o status e grava o histórico na mesma transação.

Regras da aplicação:

- O status só avança para o próximo passo do fluxo (`StatusOrdemServico::proximos()`): Aberta → Aguardando diagnóstico → Diagnóstico realizado → Orçamento enviado → Aguardando aprovação → Em reparo → Pronto para retirada → Entregue. A recusa do orçamento leva a "Orçamento recusado" e dali à entrega sem reparo. Pular ou voltar uma etapa responde 422.
- Retirada e entrega combinadas (`retirada_agendada`, `entrega_agendada`) não podem ficar numa data que já passou (o minuto atual vale); na edição, reenviar sem mudança uma data já gravada que passou não é recusado.
- Retirada ou entrega: o usuário escolhe como o equipamento volta para o cliente (consertado ou devolvido sem reparo). Pode escolher na abertura, ao marcar como pronto, na entrega ou pela edição, em qualquer etapa antes de "Entregue". Na entrega, endereço em branco usa o endereço do cadastro do cliente; sem nenhum dos dois, responde 422. Voltar para retirada apaga o endereço e a data da entrega. Com entrega, a OS pronta aparece como "Pronto para entrega" (o valor gravado continua `pronto_para_retirada`), e a mensagem do WhatsApp, a tela do cliente e o histórico mudam junto. A tela do cliente mostra a forma e a data combinada, nunca o endereço.
- Senha do usuário com 8 ou mais caracteres, pelo menos uma letra, um número e um caractere especial, guardada com bcrypt. O link de nova senha vale 60 minutos e uma vez só.
- Login limitado a 5 tentativas por minuto (por e-mail e IP); cadastro e recuperação de senha também têm limite por IP.
- A sessão (token Sanctum) expira após 30 minutos sem uso (`SESSAO_MINUTOS`); cada pedido à API renova o prazo.
- Cada assistência só vê os próprios clientes, equipamentos, OS e usuários; registro de outra assistência responde 404.
- Só o admin cria, edita, muda o perfil, desativa e reativa usuários, altera as configurações da assistência e consulta o registro de atividade (técnico recebe 403). Usuário nunca é apagado, só desativado.
- A assistência sempre mantém pelo menos um admin ativo: desativar ou tirar o perfil do último responde 422.
- Usuário desativado sai de todas as sessões na hora e não consegue entrar. Senha trocada pelo admin também encerra as sessões do usuário.
- Toda OS tem um técnico responsável (por padrão, quem abriu), que pode ser trocado por qualquer usuário da assistência por outro usuário ativo dela.
- Cada mudança de status guarda o usuário no histórico; quando o próprio cliente responde pelo link, fica sem usuário.
- O registro de atividade grava entrada e saída, criação e alteração de clientes, equipamentos, OS e orçamentos (só os campos que mudaram, com o antes e o depois), mudanças de status, gestão de usuários e das configurações. Senhas, tokens e o código do link nunca entram. Ele só aceita inserção (o model recusa `update` e `delete`). Tentativas de login com senha errada ficam só no log da aplicação.
- Termos de uso e Política de privacidade (LGPD art. 8º e 9º; Marco Civil art. 7º, VIII e XI): o cadastro só cria a conta com `aceite_termos` marcado e as versões em vigor (`versao_termos`, `versao_privacidade`, definidas em `config/termos.php`); versão antiga responde 422 pedindo para recarregar a página. Usuário criado pelo admin entra com `termos_pendentes: true` e o frontend mostra a tela de aceite antes do sistema; o admin não aceita por ele. Subir a versão em `config/termos.php` (e em `frontend/src/data/termos.js`) faz todo mundo aceitar de novo no próximo acesso. Cada aceite vira uma linha em `aceites_termos` com as versões, a data e hora, o IP e o navegador, fica no registro de atividade e não pode ser alterado nem apagado.
- O histórico de status não pode ser alterado nem apagado (o model recusa `update` e `delete`).
- O orçamento só é lançado depois do diagnóstico e pode ser corrigido até ser enviado; depois do envio, itens, valores e diagnóstico ficam travados. O total é sempre calculado no servidor.
- No envio, a validade do orçamento é gravada (10 dias por padrão, CDC art. 40). O campo `vencido` indica orçamento pendente com a validade passada.
- O backend usa o horário de Brasília (`APP_TIMEZONE=America/Sao_Paulo`) para gravar datas, calcular "hoje" e montar as mensagens; o JSON da API devolve as datas em ISO 8601 (UTC).
- Uma OS está parada quando passa mais de 3 dias na mesma etapa sem ser entregue (`dias_na_etapa` e `parada` em toda OS).
- O WhatsApp não é enviado pelo servidor: a API monta a mensagem do status atual (retirada, orçamento com itens, total, prazo e validade, reparo, pronto, devolução sem reparo, entrega), assinada com o nome da assistência, e o link `wa.me`; o técnico revisa e envia.
- O prazo é combinado em dias úteis após a aprovação (`prazo_dias`); na aprovação ele vira a data `prazo_entrega`. A resposta do cliente guarda a data e o canal (WhatsApp, telefone ou presencial, ou `link` quando o próprio cliente responde pela tela de acompanhamento).
- Resposta pelo cliente: o número da OS só dá acesso à consulta. Para aprovar ou recusar é preciso o código de 32 caracteres aleatórios gerado no envio do orçamento, que só sai no link do WhatsApp (nenhuma resposta da API o devolve), é comparado em tempo constante e deixa de valer após a primeira resposta. A rota tem limite de 10 pedidos por minuto por IP, segue as mesmas regras da resposta registrada pelo técnico (um passo no fluxo, histórico imutável) e grava no histórico que a resposta veio do próprio cliente pela tela. Orçamento vencido não pode ser aprovado por ali, só recusado: os valores precisam ser confirmados com a assistência.

## Rotas da API

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/status` | público | API e banco no ar? |
| POST | `/api/login` | público | Login do usuário (`email`, `password`), devolve token com o usuário e a assistência; usuário desativado não entra; até 5 tentativas por minuto por e-mail e IP |
| POST | `/api/cadastro` | público | Cria a conta da assistência e o primeiro usuário, já admin (`nome`, `nome_assistencia`, `telefone`, `email`, `password`, `password_confirmation`, `aceite_termos`, `versao_termos`, `versao_privacidade`), grava o aceite e devolve token |
| GET | `/api/termos` | público | Versões em vigor dos Termos de uso e da Política de privacidade e a data de vigência |
| POST | `/api/senha/esqueci` | público | Envia o link de nova senha por e-mail; responde igual com ou sem conta para o e-mail |
| POST | `/api/senha/redefinir` | público | Troca a senha (`token`, `email`, `password`, `password_confirmation`, `sair_outros` opcional, padrão sim) |
| GET | `/api/eu` | token | Usuário logado, com perfil e assistência; `termos_pendentes` indica que falta aceitar as versões atuais (`termos_atualizados`: já tinha aceitado uma versão anterior) |
| POST | `/api/termos/aceite` | token | Aceite depois do login (`aceite_termos`, `versao_termos`, `versao_privacidade`); não duplica se as versões atuais já foram aceitas |
| GET | `/api/termos/aceites` | token | Aceites do próprio usuário, mais recente primeiro |
| POST | `/api/logout` | token | Encerra o token atual |
| GET | `/api/usuarios?ativos=` | token | Usuários da assistência (ativos primeiro); `ativos=1` só os ativos |
| POST | `/api/usuarios` | admin | Cria usuário (`nome`, `email`, `perfil` admin/tecnico, `password`, `password_confirmation`) |
| PUT | `/api/usuarios/{id}` | admin | Edita nome, e-mail e perfil; senha opcional (em branco mantém) |
| POST | `/api/usuarios/{id}/desativar` | admin | Desativa e encerra as sessões (nunca o último admin ativo) |
| POST | `/api/usuarios/{id}/reativar` | admin | Reativa o acesso |
| GET | `/api/assistencia` | token | Configurações da assistência |
| PUT | `/api/assistencia` | admin | Altera `nome`, `telefone` e `dias_limite_parada` |
| GET | `/api/atividades?usuario_id=&acao=&entidade=&entidade_id=&de=&ate=&page=` | admin | Registro de atividade, mais recente primeiro, 50 por página |
| GET | `/api/clientes?busca=` | token | Clientes da assistência em ordem de nome, com nº de equipamentos e data da última OS; `busca` filtra por nome ou telefone |
| POST | `/api/clientes` | token | Cadastra cliente (`nome`, `telefone_whatsapp`, `endereco`) |
| GET | `/api/clientes/{id}` | token | Ficha do cliente com equipamentos e OS |
| PUT | `/api/clientes/{id}` | token | Edita o cliente |
| GET | `/api/equipamentos?busca=&cliente_id=` | token | Equipamentos dos clientes da assistência, com o dono e o nº de OS; `busca` filtra por tipo, marca, modelo, número de série ou nome do cliente |
| POST | `/api/equipamentos` | token | Cadastra equipamento (`cliente_id`, `tipo`, `marca`, `modelo`, `numero_serie` opcional) |
| GET | `/api/equipamentos/{id}` | token | Ficha do equipamento com o cliente e as OS |
| PUT | `/api/equipamentos/{id}` | token | Edita o equipamento (não muda de cliente) |
| GET | `/api/ordens-servico?busca=&status=&tipo=&de=&ate=&pendentes=&paradas=&minhas=&responsavel_id=&ordem=&equipamento_id=&cliente_id=` | token | Busca de OS da assistência, com equipamento, nome e telefone do cliente (sem endereço), `dias_na_etapa` e `parada`. `busca` compara número da OS, nome ou telefone do cliente, marca e modelo; `de`/`ate` filtram a abertura (aaaa-mm-dd); `pendentes=1` tira as entregues; `paradas=1` traz só as paradas; `minhas=1` ou `responsavel_id` filtram pelo técnico responsável; `ordem` é `recentes` (padrão), `antigas` ou `mudanca` |
| POST | `/api/ordens-servico` | token | Abre a OS (`equipamento_id`, `problema_relatado`, `retirada_agendada` e `responsavel_id` opcionais) com status "Aberta" |
| PUT | `/api/ordens-servico/{id}/responsavel` | token | Troca o técnico responsável (`responsavel_id`, usuário ativo da assistência) |
| GET | `/api/ordens-servico/{id}` | token | Ficha da OS com equipamento, cliente, orçamento com itens e histórico em ordem cronológica |
| PUT | `/api/ordens-servico/{id}` | token | Edita a OS sem mudar o status (cada campo nas etapas permitidas), incluindo `forma_devolucao`, `endereco_entrega` e `entrega_agendada` até a entrega |
| POST | `/api/ordens-servico/{id}/retirada` | token | Registra a retirada (`data_retirada` e `observacao` opcionais, como estado do aparelho e acessórios) → "Aguardando diagnóstico" |
| POST | `/api/ordens-servico/{id}/diagnostico` | token | Registra o diagnóstico (`diagnostico`) → "Diagnóstico realizado"; até o envio do orçamento, corrige o texto |
| PUT | `/api/ordens-servico/{id}/orcamento` | token | Lança ou corrige o orçamento (`prazo_dias`, `validade_dias` opcional, `itens` com `tipo` peca/servico, `descricao`, `quantidade`, `valor_unitario`) |
| POST | `/api/ordens-servico/{id}/orcamento/envio` | token | Marca o orçamento como enviado → "Orçamento enviado" e "Aguardando aprovação" |
| POST | `/api/ordens-servico/{id}/orcamento/resposta` | token | Registra a resposta (`aprovado` true/false, `canal`, `observacao` opcional) → "Em reparo" ou "Orçamento recusado" |
| PUT | `/api/ordens-servico/{id}/reparo` | token | Registra o serviço executado e as peças trocadas (só em reparo) |
| POST | `/api/ordens-servico/{id}/pronto` | token | "Em reparo" → "Pronto para retirada" ou "Pronto para entrega" (exige o serviço executado; aceita `forma_devolucao`, `endereco_entrega`, `entrega_agendada`) |
| POST | `/api/ordens-servico/{id}/entrega` | token | Entrega e encerra a OS ("Pronto para retirada/entrega" ou "Orçamento recusado") → "Entregue"; aceita os mesmos campos de devolução |
| GET | `/api/ordens-servico/{id}/historico` | token | Histórico de status em ordem cronológica |
| GET | `/api/ordens-servico/{id}/whatsapp` | token | Mensagem pronta para o status atual, com o link da tela de acompanhamento (`acompanhamento`), e link `wa.me` para o técnico enviar ao cliente |
| GET | `/api/acompanhar/{numero}` | público | Andamento da OS para o cliente: status, equipamento, histórico e orçamento depois de enviado (total, itens, prazo, validade e se venceu), sem dados pessoais (limite de 20 consultas por minuto) |
| POST | `/api/acompanhar/{numero}/orcamento/resposta` | público + código | O cliente aprova ou recusa (`codigo` do link, `aprovado` true/false) → "Em reparo" ou "Orçamento recusado", canal `link`. 403 com código errado, 422 fora de "Aguardando aprovação" ou ao aprovar orçamento vencido (limite de 10 por minuto) |

Envie o token no cabeçalho `Authorization: Bearer <token>`. Cliente, equipamento, OS ou usuário de outra assistência responde 404. O `tipo` do equipamento aceita Smartphone, Tablet, Notebook, Videogame e Controle de videogame.

Os testes (`php artisan test`) usam o banco local e desfazem tudo ao final de cada teste.
