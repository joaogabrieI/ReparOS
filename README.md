# ReparOS

Sistema de gestão de ordens de serviço para assistências técnicas.

| Pasta | O que é | Tecnologia |
|---|---|---|
| [`backend/`](backend) | API REST | Laravel 12 (PHP 8.2+), PostgreSQL, Sanctum |
| [`frontend/`](frontend) | Interface web | React 19 + Vite |

O frontend conversa com o backend só pela API (`http://localhost:8000/api`). O CORS do Laravel já libera o endereço do frontend (`FRONTEND_URL` no `.env` do backend).

Perfis: **Técnico** (faz login e gerencia tudo) e **Cliente** (acompanha a OS sem conta). Não há cadastro de funcionários.

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

A API fica em http://localhost:8000. O seed cria o técnico `tecnico@reparos.test` (senha `senha123`) com um cliente, um equipamento e uma OS de exemplo.

### 4. Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abra http://localhost:5173 e entre em `#/entrar` com o técnico do seed. Todas as telas do técnico usam a API:

- **Início**, **OS pendentes** e barra lateral: listagem de OS (`/api/ordens-servico`), com as paradas destacadas pelo campo `parada` da API; a busca e o filtro "só paradas" das pendentes vão para a API.
- **Buscar OS**: busca (nº da OS, cliente, telefone, marca ou modelo), tipo, status, período, "só paradas" e ordenação, todos aplicados na API.
- **Abrir OS**: escolhe o cliente (ou cadastra um novo), escolhe ou cadastra o equipamento e abre a OS com o problema e a retirada combinada.
- **Detalhe da OS**: cada etapa chama a rota dela (retirada, diagnóstico, orçamento com rascunho e envio, resposta do cliente com o canal, reparo com peças trocadas, pronto, entrega ou devolução sem reparo) e mostra o histórico devolvido pela API. O botão **Enviar WhatsApp** abre o link `wa.me` montado por `/whatsapp`; enviar o orçamento salva, registra o envio e abre a mensagem com a validade.
- **Clientes**: listagem, busca, ficha, cadastro e edição de clientes e de equipamentos.

Os erros de validação (422) aparecem ao lado de cada campo. O cliente acompanha o reparo sem login em `#/acompanhar` (ou `#/acompanhar/<número da OS>`), com link na tela de entrar. Cadastro e recuperação de senha ficam em `#/cadastro` e `#/esqueci-senha`.

## Estrutura

```
backend/
  app/Enums/           Status da OS (9), situação do orçamento, tipo de item
  app/Models/          Tecnico, Cliente, Equipamento, OrdemServico, Orcamento, ItemOrcamento, HistoricoStatus
  app/Http/Controllers StatusController (saúde da API), AuthController (login do técnico), ClienteController, EquipamentoController
  app/Http/Requests    Validação dos dados do cliente e do equipamento
  config/cors.php      Liberação do frontend
  database/migrations  Tabelas do modelo de dados
  database/seeders     Dados de exemplo
  routes/api.php       Rotas da API
frontend/
  src/services/        Cliente HTTP para a API (token do login) e chamadas de clientes, equipamentos e OS
  src/pages/           Telas (login, cadastro, senha, Início, OS pendentes, Buscar OS, Abrir OS, Detalhe da OS, Clientes, Acompanhar)
  src/components/      Componentes reutilizáveis (barra lateral, diálogos, etiqueta de status)
  src/styles/          Design system Nocturne, copiado do projeto de design
  src/data/            Status da OS, dados compartilhados das telas (store), formatação e prévia do orçamento
```

## Modelo de dados

As migrations seguem o DER (`modelo-dados/ReparOS_diagrama_ER.svg`), com os nomes no padrão do Laravel:

| DER | Banco |
|---|---|
| `id_tecnico`, `id_cliente`... | `id` em cada tabela; chaves estrangeiras como `tecnico_id`, `cliente_id`, `ordem_servico_id` |
| `senha_hash` | `password` (o Laravel guarda o hash) |
| `data_cadastro` | `created_at` |
| Ordem de serviço | tabela `ordens_servico` |
| Item do orçamento | tabela `itens_orcamento` |
| Histórico de status | tabela `historico_status` |

Regras garantidas pelo banco:

- `status` da OS aceita só os 9 valores: aberta, aguardando_diagnostico, diagnostico_realizado, orcamento_enviado, aguardando_aprovacao, orcamento_recusado, em_reparo, pronto_para_retirada, entregue.
- Cada OS tem no máximo um orçamento (`ordem_servico_id` único em `orcamentos`).
- O WhatsApp do cliente é único dentro de cada técnico, para que duas assistências possam atender o mesmo cliente. A API guarda só DDD e número (`11988887777`), então `(11) 98888-7777` e `+55 11 98888-7777` contam como o mesmo telefone.
- Toda OS nasce como "Aberta" com número próprio, e `OrdemServico::mudarStatus()` troca o status e grava o histórico na mesma transação.

Regras da aplicação:

- O status só avança para o próximo passo do fluxo (`StatusOrdemServico::proximos()`): Aberta → Aguardando diagnóstico → Diagnóstico realizado → Orçamento enviado → Aguardando aprovação → Em reparo → Pronto para retirada → Entregue. A recusa do orçamento leva a "Orçamento recusado" e dali à entrega sem reparo. Pular ou voltar uma etapa responde 422.
- O histórico de status não pode ser alterado nem apagado (o model recusa `update` e `delete`).
- O orçamento só é lançado depois do diagnóstico e pode ser corrigido até ser enviado; depois do envio, itens, valores e diagnóstico ficam travados. O total é sempre calculado no servidor.
- No envio, a validade do orçamento é gravada (10 dias por padrão, CDC art. 40). O campo `vencido` indica orçamento pendente com a validade passada.
- Uma OS está parada quando passa mais de 3 dias na mesma etapa sem ser entregue (`dias_na_etapa` e `parada` em toda OS).
- O WhatsApp não é enviado pelo servidor: a API monta a mensagem do status atual (retirada, orçamento com itens, total, prazo e validade, reparo, pronto, devolução sem reparo, entrega), assinada com o nome da assistência, e o link `wa.me`; o técnico revisa e envia.
- O prazo é combinado em dias úteis após a aprovação (`prazo_dias`); na aprovação ele vira a data `prazo_entrega`. A resposta do cliente guarda a data e o canal (WhatsApp, telefone ou presencial).

## Rotas da API

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/status` | público | API e banco no ar? |
| POST | `/api/login` | público | Login do técnico, devolve token |
| GET | `/api/eu` | token | Dados do técnico logado |
| POST | `/api/logout` | token | Encerra o token atual |
| GET | `/api/clientes?busca=` | token | Clientes do técnico em ordem de nome, com nº de equipamentos e data da última OS; `busca` filtra por nome ou telefone |
| POST | `/api/clientes` | token | Cadastra cliente (`nome`, `telefone_whatsapp`, `endereco`) |
| GET | `/api/clientes/{id}` | token | Ficha do cliente com equipamentos e OS |
| PUT | `/api/clientes/{id}` | token | Edita o cliente |
| GET | `/api/equipamentos?busca=&cliente_id=` | token | Equipamentos dos clientes do técnico, com o dono e o nº de OS; `busca` filtra por tipo, marca, modelo, número de série ou nome do cliente |
| POST | `/api/equipamentos` | token | Cadastra equipamento (`cliente_id`, `tipo`, `marca`, `modelo`, `numero_serie` opcional) |
| GET | `/api/equipamentos/{id}` | token | Ficha do equipamento com o cliente e as OS |
| PUT | `/api/equipamentos/{id}` | token | Edita o equipamento (não muda de cliente) |
| GET | `/api/ordens-servico?busca=&status=&tipo=&de=&ate=&pendentes=&paradas=&ordem=&equipamento_id=&cliente_id=` | token | Busca de OS dos clientes do técnico, com equipamento, nome e telefone do cliente (sem endereço), `dias_na_etapa` e `parada`. `busca` compara número da OS, nome ou telefone do cliente, marca e modelo; `de`/`ate` filtram a abertura (aaaa-mm-dd); `pendentes=1` tira as entregues; `paradas=1` traz só as paradas; `ordem` é `recentes` (padrão), `antigas` ou `mudanca` |
| POST | `/api/ordens-servico` | token | Abre a OS (`equipamento_id`, `problema_relatado`, `retirada_agendada` opcional) com status "Aberta" |
| GET | `/api/ordens-servico/{id}` | token | Ficha da OS com equipamento, cliente, orçamento com itens e histórico em ordem cronológica |
| PUT | `/api/ordens-servico/{id}` | token | Edita `problema_relatado` e `retirada_agendada` (só antes do diagnóstico) |
| POST | `/api/ordens-servico/{id}/retirada` | token | Registra a retirada (`data_retirada` e `observacao` opcionais, como estado do aparelho e acessórios) → "Aguardando diagnóstico" |
| POST | `/api/ordens-servico/{id}/diagnostico` | token | Registra o diagnóstico (`diagnostico`) → "Diagnóstico realizado"; até o envio do orçamento, corrige o texto |
| PUT | `/api/ordens-servico/{id}/orcamento` | token | Lança ou corrige o orçamento (`prazo_dias`, `validade_dias` opcional, `itens` com `tipo` peca/servico, `descricao`, `quantidade`, `valor_unitario`) |
| POST | `/api/ordens-servico/{id}/orcamento/envio` | token | Marca o orçamento como enviado → "Orçamento enviado" e "Aguardando aprovação" |
| POST | `/api/ordens-servico/{id}/orcamento/resposta` | token | Registra a resposta (`aprovado` true/false, `canal`, `observacao` opcional) → "Em reparo" ou "Orçamento recusado" |
| PUT | `/api/ordens-servico/{id}/reparo` | token | Registra o serviço executado e as peças trocadas (só em reparo) |
| POST | `/api/ordens-servico/{id}/pronto` | token | "Em reparo" → "Pronto para retirada" (exige o serviço executado) |
| POST | `/api/ordens-servico/{id}/entrega` | token | Entrega e encerra a OS ("Pronto para retirada" ou "Orçamento recusado") → "Entregue" |
| GET | `/api/ordens-servico/{id}/historico` | token | Histórico de status em ordem cronológica |
| GET | `/api/ordens-servico/{id}/whatsapp` | token | Mensagem pronta para o status atual e link `wa.me` para o técnico enviar ao cliente |
| GET | `/api/acompanhar/{numero}` | público | Andamento da OS para o cliente: status, equipamento, histórico e orçamento depois de enviado, sem dados pessoais (limite de 20 consultas por minuto) |

Envie o token no cabeçalho `Authorization: Bearer <token>`. Cliente, equipamento ou OS de outro técnico responde 404. O `tipo` do equipamento aceita Smartphone, Tablet, Notebook, Videogame e Controle de videogame.

Os testes (`php artisan test`) usam o banco local e desfazem tudo ao final de cada teste.
