# Conselho Tutelar - Back-end API

API REST moderna desenvolvida em Node.js com Express e MySQL para o sistema de gestão do Conselho Tutelar.

A aplicação conta com arquitetura de segurança **Zero-Trust**, controle de acesso baseado em papéis (**RBAC**), trilha de auditoria permanente com **imutabilidade criptográfica (SHA-256)** e suporte completo a containers com **Docker**.

---

## 🛡️ Destaques da Arquitetura

- **Segurança Zero-Trust & RBAC:** Autenticação stateless via JSON Web Tokens (JWT) com verificação em cada requisição e distinção de privilégios (`admin` para gestão/diretoria e `conselheiro` para atuação técnica).
- **Trilha de Auditoria Imutável (Anti-Tampering):** Registro contínuo de todas as ações sensíveis com encadeamento de hashes SHA-256, *snapshots* dos operadores no momento da ação e bloqueio total de edições/exclusões via triggers no banco de dados.
- **Rastreabilidade Permanente Entre Mandatos:** Preservação integral do histórico de auditoria e medidas, garantindo conformidade legal mesmo após a transição de mandatos e conselheiros.
- **Georreferenciamento:** Integração com mapas para geocodificação e espacialização de denúncias e ocorrências.
- **Migrations & Seeds Automatizados:** Versionamento declarativo de banco com suporte a scripts SQL e JavaScript.

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
3. *(Opcional, mas recomendado)* Popule os usuários e registros iniciais:
   ```bash
   npm run db:seed
   ```
4. Inicie o servidor Node.js com auto-reload:
   ```bash
   npm run dev
   ```

---

### 5. Executar os Testes Automatizados (E2E)
A aplicação possui uma suíte integrada de testes ponta a ponta validando autenticação, fluxo de denúncias, permissões e integridade criptográfica da auditoria:
```bash
npm test
```

---

## 👤 Credenciais Padrão de Acesso (Demonstração / Seed)

O comando `npm run db:seed` inicializa os seguintes usuários no banco (senhas criptografadas com `bcrypt`):

| Usuário | Senha | Perfil (`role`) | Cargo | Privilégios no Sistema |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `admin` | `admin` | Secretária Municipal | Acesso total, gestão de conselheiros/usuários, consulta à trilha de auditoria e verificação de integridade |
| `conselheiro` | `conselheiro` | `conselheiro` | Conselheiro Tutelar | Registro e consulta de denúncias, fichas de atendimento, notificações, medidas de proteção e marcadores no mapa |

---

## 🧰 Guia de Comandos Úteis (Cheat Sheet)

### 📦 Desenvolvimento & Servidor
| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia a API com auto-reload (`node --watch`) e executa auto-migrations |
| `npm start` | Inicia a API em modo padrão de produção |
| `node src/server.js` | Executa o ponto de entrada da aplicação manualmente |

### 🧪 Testes Automatizados
| Comando | Descrição |
| :--- | :--- |
| `npm test` | Executa a suíte completa de testes de integração E2E com validação Zero-Trust |
| `npm run test:e2e` | Alias para `npm test` |

### 🗄️ Banco de Dados, Migrations & Seeds
| Comando | Descrição |
| :--- | :--- |
| `npm run migrate` | Executa todas as migrations pendentes (`.sql` e `.js`) |
| `npm run db:migrate` | Alias para `npm run migrate` |
| `npm run db:seed` | Popula usuários padrão com hash bcrypt e dados de exemplo |
| `npm run migrate:create <nome>` | Cria um novo arquivo versionado em `migrations/` |
| `npm run db:init` | Executa a inicialização legada direta do banco |

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
| `JWT_SECRET` | Chave secreta de assinatura criptográfica dos tokens JWT | *(chave padrão de 256 bits)* |
| `JWT_EXPIRES_IN` | Tempo de expiração do token de sessão | `8h` |
| `MANDATO_VIGENTE` | Identificador do mandato atual para a trilha de auditoria | `Gestão 2024-2027` |

---

## 📡 Endpoints da API

Todas as rotas protegidas exigem o cabeçalho HTTP:
```http
Authorization: Bearer <TOKEN_JWT>
```

### 🔓 Públicos & Diagnóstico
| Método | Rota | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Pública | Verificação de status e catálogo de endpoints disponíveis |
| `GET` | `/test-db` | Pública | Teste de conectividade e integridade com o MySQL |

### 🔐 Autenticação & Sessão
| Método | Rota | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Pública | Autenticação por usuário e senha; retorna token JWT e dados do perfil |
| `GET` | `/auth/me` | Autenticado | Retorna os dados do usuário autenticado no token atual |
| `POST` | `/auth/logout` | Autenticado | Encerramento de sessão com registro na auditoria |

### 👥 Conselheiros & Profissionais
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/conselheiros` | Autenticado | Lista todos os conselheiros e profissionais cadastrados |
| `GET` | `/conselheiros/:id` | Autenticado | Detalha um conselheiro específico pelo ID |
| `POST` | `/conselheiros` | **Admin** | Cadastra um novo conselheiro ou operador |
| `PUT` | `/conselheiros/:id` | **Admin** | Atualiza os dados de um profissional |
| `DELETE` | `/conselheiros/:id` | **Admin** | Remove o registro de um profissional |

### 🚨 Denúncias
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/denuncias` | Autenticado | Lista todas as denúncias registradas |
| `GET` | `/denuncias/:id` | Autenticado | Obtém os detalhes completos de uma denúncia |
| `POST` | `/denuncias` | Autenticado | Registra uma nova denúncia (com geocodificação automática de endereço) |

### 📝 Atendimentos
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/atendimentos` | Autenticado | Lista todos os atendimentos realizados |
| `GET` | `/atendimentos/:id` | Autenticado | Detalha uma ficha de atendimento pelo ID |
| `POST` | `/atendimentos` | Autenticado | Registra uma nova ficha de atendimento |

### 📩 Notificações
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/notificacoes` | Autenticado | Lista todas as notificações emitidas |
| `GET` | `/notificacoes/:id` | Autenticado | Detalha uma notificação pelo ID |
| `POST` | `/notificacoes` | Autenticado | Cria e emite uma nova notificação |

### ⚖️ Termos de Medidas Aplicadas
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/termos-medidas-menor` | Autenticado | Lista medidas protetivas aplicadas a crianças/adolescentes (ECA Art. 101) |
| `POST` | `/termos-medidas-menor` | Autenticado | Registra um termo de medidas para menores |
| `GET` | `/termos-medidas-responsavel` | Autenticado | Lista medidas aplicadas a pais ou responsáveis (ECA Art. 129) |
| `POST` | `/termos-medidas-responsavel` | Autenticado | Registra um termo de medidas para pais/responsáveis |

### 📂 Documentos Unificados
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/documentos` | Autenticado | Retorna visão agregada de todos os tipos de documentos (denúncias, atendimentos, notificações e termos) |

### 🗺️ Georreferenciamento & Mapa
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/marcadores-mapa` | Autenticado | Lista as coordenadas e metadados de ocorrências no mapa |
| `POST` | `/marcadores-mapa` | Autenticado | Cria um marcador manual no mapa |
| `POST` | `/marcadores-mapa/geocodificar` | Autenticado | Geocodifica um endereço em latitude/longitude via OpenStreetMap/Nominatim |

### 📜 Auditoria Imutável & Compliance
| Método | Rota | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/auditoria` | **Admin** | Consulta paginada da trilha de auditoria com filtros avançados (mandato, ação, recurso, operador, período) |
| `GET` | `/auditoria/integridade` | **Admin** | Valida a integridade criptográfica da cadeia de hashes SHA-256 (Anti-Tamper Check) |
| `GET` | `/auditoria/estatisticas` | **Admin** | Métricas consolidadas de compliance, alertas de acesso negado e distribuição por mandatos |

---

## 🔒 Mecanismos de Segurança e Integridade

### Modelo Zero-Trust
1. **Verificação Contínua:** Nenhuma rota de domínio confia na origem implicitamente. Cada requisição é validada pelo `authMiddleware`.
2. **Princípio do Menor Privilégio:** Rotas sensíveis (como auditoria e gerenciamento de membros) são estritamente isoladas pelo `roleMiddleware` (`requireRole('admin')`).
3. **Senhas Seguras:** Armazenamento exclusivamente com hash e salt via algoritmo `bcrypt`.

### Trilha de Auditoria Criptográfica
1. **Encadeamento SHA-256:** Cada evento calcula seu próprio hash combinando `timestamp`, dados do operador, ação executada, recurso e o `hashAnterior` do registro precedente, formando uma sequência contínua a partir de um bloco gênese.
2. **Proteção Anti-Tampering (Triggers SQL):** Triggers `trg_prevent_audit_update` e `trg_prevent_audit_delete` impedem qualquer tentativa de exclusão ou alteração de registros no banco, retornando código `SQLSTATE 45000`.
3. **Independência de Mandatos:** As ações gravam um *snapshot* imutável contendo nome, cargo e CPF do operador no momento da operação, associados ao mandato vigente (`mandatoGestao`). Caso conselheiros encerrem o mandato ou sejam desativados, o histórico de atos praticados permanece 100% inalterado e auditável.

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
Para descartar os dados locais, apagar o volume persistente e rodar as migrations e seeds novamente:
```bash
docker compose down -v
npm run docker:up
npm run db:seed
```

### O container não conecta ou acusa recusa de conexão
O servidor possui retry automático integrado (5 tentativas com intervalo de 3s). Caso o banco demore para inicializar, confira os logs com:
```bash
npm run docker:logs
```
