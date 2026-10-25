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

Abra http://localhost:5173. Por enquanto o frontend é só navegação: as telas mostram dados de exemplo (`src/data/exemplo.js`), não chamam a API e os botões apenas levam de uma página para outra. Login, cadastro e recuperação de senha ficam em `#/entrar`, `#/cadastro` e `#/esqueci-senha`.

## Estrutura

```
backend/
  app/Enums/           Status da OS (9), situação do orçamento, tipo de item
  app/Models/          Tecnico, Cliente, Equipamento, OrdemServico, Orcamento, ItemOrcamento, HistoricoStatus
  app/Http/Controllers StatusController (saúde da API), AuthController (login do técnico)
  config/cors.php      Liberação do frontend
  database/migrations  Tabelas do modelo de dados
  database/seeders     Dados de exemplo
  routes/api.php       Rotas da API
frontend/
  src/services/api.js  Cliente HTTP para a API
  src/pages/           Telas (login, cadastro, senha, Início, OS pendentes, Buscar OS, Abrir OS, Detalhe da OS, Clientes)
  src/components/      Componentes reutilizáveis (barra lateral, diálogos, etiqueta de status)
  src/styles/          Design system Nocturne, copiado do projeto de design
  src/data/            Status da OS, dados de exemplo e textos do WhatsApp
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
- O WhatsApp do cliente é único dentro de cada técnico, para que duas assistências possam atender o mesmo cliente.
- Toda OS nasce como "Aberta" com número próprio, e `OrdemServico::mudarStatus()` troca o status e grava o histórico na mesma transação.

## Rotas da API

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/status` | público | API e banco no ar? |
| POST | `/api/login` | público | Login do técnico, devolve token |
| GET | `/api/eu` | token | Dados do técnico logado |
| POST | `/api/logout` | token | Encerra o token atual |

Envie o token no cabeçalho `Authorization: Bearer <token>`.
