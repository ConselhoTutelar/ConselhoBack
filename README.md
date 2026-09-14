# Conselho Tutelar - Back-end API

API REST em Node.js com Express e MySQL para o sistema de gestão do Conselho Tutelar.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) (incluso no instalador do Node.js)
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Como Rodar o Projeto (Guia de Onboarding)

Siga os passos abaixo ao clonar o repositório pela primeira vez:

### 1. Clonar o repositório
```bash
# Via SSH (recomendado):
git clone git@github.com:ConselhoTutelar/ConselhoBack.git conselho-tutelar-back

# Ou via HTTPS:
git clone https://github.com/ConselhoTutelar/ConselhoBack.git conselho-tutelar-back

# Entrar no diretório do projeto:
cd conselho-tutelar-back
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar as variáveis de ambiente (`.env`)
Copie o arquivo de exemplo para criar o `.env` local:
- **Git Bash / Linux / macOS:**
  ```bash
  cp .env.example .env
  ```
- **PowerShell (Windows):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **Prompt de Comando (CMD):**
  ```cmd
  copy .env.example .env
  ```

> [!NOTE]
> As variáveis padrão do `.env.example` já estão pré-configuradas para funcionar perfeitamente com os containers Docker.

---

### 4. Inicializar a Aplicação

Escolha uma das duas formas abaixo para rodar o projeto:

#### Opção A: Ecossistema Completo via Docker (Recomendado)
Sobe o banco de dados MySQL, a API back-end e o front-end simultaneamente em containers, aplicando as migrations automaticamente:
```bash
npm run docker:up
```

- **API Back-end:** `http://localhost:3000`
- **Front-end Web:** `http://localhost:5173`
- **MySQL 8.0:** porta `3306`

#### Opção B: Back-end no Host + MySQL no Docker
Ideal se preferir depurar o Node.js diretamente na sua máquina:
1. Suba apenas o container do MySQL:
   ```bash
   npm run docker:db
   ```
2. Execute as migrations no banco:
   ```bash
   npm run migrate
   ```
3. Inicie o servidor Node.js com auto-reload:
   ```bash
   npm run dev
   ```

---

## 🧰 Guia de Comandos Úteis (Cheat Sheet)

### 📦 Desenvolvimento & Servidor
| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia a API com auto-reload (`node --watch`) e executa auto-migrations |
| `npm start` | Inicia a API em modo padrão de produção |
| `node server.js` | Executa o ponto de entrada da aplicação manualmente |

### 🗄️ Banco de Dados & Migrations
| Comando | Descrição |
| :--- | :--- |
| `npm run migrate` | Executa todas as migrations `.sql` pendentes |
| `npm run db:migrate` | Alias para `npm run migrate` |
| `npm run migrate:create <nome>` | Cria um novo arquivo versionado em `migrations/` (ex: `002_adicionar_tabela.sql`) |
| `npm run db:init` | Executa o script direto que inicializa o `schema.sql` legado |

### 🐳 Docker & Containers
| Comando | Descrição |
| :--- | :--- |
| `npm run docker:up` | Constrói as imagens e sobe todos os serviços (`db`, `backend`, `frontend`) |
| `npm run docker:down` | Para e remove todos os containers da aplicação |
| `npm run docker:logs` | Visualiza e acompanha logs de todos os containers em tempo real |
| `npm run docker:db` | Sobe **apenas** o container do MySQL 8.0 em segundo plano |
| `docker compose ps` | Lista o status e as portas dos containers em execução |
| `docker compose restart backend` | Reinicia apenas o container da API back-end |
| `docker compose logs -f backend` | Acompanha os logs exclusivos da API back-end |
| `docker compose logs -f db` | Acompanha os logs exclusivos do container do MySQL |

---

## ⚙️ Variáveis de Ambiente

Configuradas no arquivo `.env`:

| Variável | Descrição | Padrão no `.env.example` |
| :--- | :--- | :--- |
| `PORT` | Porta em que o servidor HTTP da API irá escutar | `3000` |
| `NODE_ENV` | Ambiente de execução (`development`, `production`) | `development` |
| `DB_HOST` | Host do banco (`127.0.0.1` localmente ou `db` no Docker) | `127.0.0.1` |
| `DB_PORT` | Porta do banco de dados MySQL | `3306` |
| `DB_NAME` | Nome do banco de dados | `conselhotutelar` |
| `DB_USER` | Usuário com permissões no banco | `conselho_user` |
| `DB_PASSWORD` | Senha do usuário do banco | `conselhopassword` |
| `DB_ROOT_PASSWORD` | Senha de root utilizada na criação do container MySQL | `rootpassword` |
| `CORS_ORIGIN` | Origens autorizadas para CORS (separadas por vírgula) | `http://localhost:5173,http://localhost:3000` |

---

## 📡 Endpoints da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/` | Verificação de status e lista de endpoints disponíveis |
| `GET` | `/test-db` | Teste de conectividade com o banco de dados |
| `GET` | `/conselheiros` | Lista todos os conselheiros cadastrados |
| `GET` | `/denuncias` | Lista todas as denúncias |
| `POST` | `/denuncias` | Registra uma nova denúncia (com geocodificação no mapa) |
| `GET` | `/atendimentos` | Lista todos os atendimentos |
| `POST` | `/atendimentos` | Registra um novo atendimento |
| `GET` | `/notificacoes` | Lista todas as notificações |
| `POST` | `/notificacoes` | Cria uma nova notificação |
| `GET` | `/termos-medidas-menor` | Lista termos de medidas aplicadas a menor |
| `POST` | `/termos-medidas-menor` | Cria termo de medidas para menor |
| `GET` | `/termos-medidas-responsavel` | Lista termos de medidas para responsáveis |
| `POST` | `/termos-medidas-responsavel` | Cria termo de medidas para responsáveis |
| `GET` | `/documentos` | Consulta agregada de todos os tipos de documentos |
| `GET` | `/marcadores-mapa` | Lista as coordenadas dos marcadores no mapa |
| `POST` | `/marcadores-mapa` | Cria um marcador manual no mapa |

---

## 🔍 Resolução de Problemas (Troubleshooting)

### A porta 3306 já está em uso
Se você já tiver um serviço MySQL instalado localmente rodando na porta `3306`:
1. Altere a porta no seu arquivo `.env`:
   ```env
   DB_PORT=3307
   ```
2. Reinicie os containers:
   ```bash
   npm run docker:down
   npm run docker:up
   ```

### Resetar o banco de dados do zero
Para descartar os dados locais, apagar o volume persistente e rodar as migrations novamente:
```bash
docker compose down -v
npm run docker:up
```

### O container não conecta ou acusa recusa de conexão
O servidor possui retry automático integrado (5 tentativas com intervalo de 3s). Caso o banco demore para inicializar, confira os logs com:
```bash
npm run docker:logs
```
