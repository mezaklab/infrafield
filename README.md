# 🌐 InfraField — Plataforma de Gestão de TI, NOC & Helpdesk

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18.3-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.4-purple?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.19-lightgrey?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5.19-indigo?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![PWA](https://img.shields.io/badge/PWA-Offline--Ready-orange?logo=pwa)

**InfraField** é uma plataforma corporativa em **monorepo** para gestão completa de infraestrutura de TI, Centro de Operações de Rede (NOC), inventário unificado de ativos e periféricos, monitoramento em tempo real de conectividade, Helpdesk / Chamados de TI, relatórios técnicos e suporte às operações de campo.

---

## 🏗️ Arquitetura do Sistema

O projeto adota uma arquitetura Monorepo organizada em workspaces (`apps/web` e `apps/api`):

- **Frontend (`apps/web`)**: React 18, TypeScript, Vite 6, Tailwind CSS, Lucide Icons, Recharts e suporte PWA (`vite-plugin-pwa` com Dexie para armazenamento offline).
- **Backend (`apps/api`)**: Node.js 20, Express 4.19, TypeScript, WebSockets (Socket.io) para telemetria em tempo real, Helmet, Rate Limiting, autenticação JWT, OCR local e integrações externas (Evolution API / WhatsApp).
- **Banco de Dados & ORM**: PostgreSQL 16 com Prisma ORM 5.19.

---

## 💻 Módulos Principais

### 1. 📡 Monitoramento NOC & Rede (`/assets`)
Varredura e monitoramento de conectividade ICMP/ARP com persistência por MAC Address:
- **Network Sweep & Ping Check**: Verificação contínua de integridade de ativos de rede.
- **Rastreio DHCP Dinâmico**: O sistema rastreia alterações de IP mantendo o vínculo com o MAC Address (`currentIp` e `DeviceIpHistory`).
- **Estados de Monitoramento**: `ONLINE`, `OFFLINE`, `DEGRADED` e `UNKNOWN`.

### 2. 🖥️ Gestão de Ativos & Periféricos (`/peripherals`)
Catálogo unificado categorizado de equipamentos corporativos:
- **Categorias e Subcategorias**: Computadores (Desktop, Notebook, Servidor), Monitores, Impressoras, Scanners, Switches, Roteadores, APs, Nobreaks, NAS/Storage, Thin Clients, Telefonia IP e Câmeras IP.
- **Controle de Propriedade**: Gestão de patrimônio próprio (`PROPRIO`) ou alugado (`LOCADO`) com identificação da empresa locadora.
- **Leitura de Código de Barras & QR Code**: Leitor nativo integrado via `@zxing/library` e `qrcode` para identificação rápida no campo.

### 3. 🔍 InfraField Lens
Assistente de visão computacional embutido na aplicação web/mobile:
- **OCR Local & Offline-ready**: Processamento de imagens de etiquetas e equipamentos via Tesseract.js e Sharp sem dependência de APIs pagas de terceiros.
- **Reconhecimento Assistido**: Extração automática de Número de Série, Modelo, Fabricante, MAC Address e Tag de Patrimônio.
- **Fluxo Direto**: Confirmação manual pelo técnico com auto-preenchimento nos formulários de cadastro de ativos e periféricos.

### 4. ⚡ Onboarding Automático via PowerShell (`/onboard`)
Coleta automatizada de inventário em máquinas Windows:
- Rota isolada e dedicada para recepção de payloads de inventário via script PowerShell (`/api/assets/onboard`).
- Captura de hostname, serial, MAC, IP, CPU, RAM, SO e discos.
- Proteção dedicada por rate limiting (`onboardingRateLimiter`).

### 5. 🎫 Helpdesk & Gestão de Chamados (`/tickets` e `/tickets/dashboard`)
Ciclo completo de vida dos tickets de suporte de TI:
- **Prioridades**: `BAIXA`, `MEDIA`, `ALTA`, `CRITICA`.
- **Status**: `ABERTO`, `EM_ATENDIMENTO`, `AGUARDANDO_USUARIO`, `RESOLVIDO`, `CANCELADO`.
- **Vínculos Flexíveis**: Associação opcional ou obrigatória a Setores (`Sector`), Categorias (`Category`), Localidades (`Location`) e Ativos (`Asset`).
- **Notificações via WhatsApp (Evolution API)**: Disparo assíncrono e isolado de mensagens de novos chamados via Evolution API para grupos ou contatos configurados.
- **Visão do Usuário Final (`USUARIO`)**: Interface simplificada exclusiva para abertura e acompanhamento de tickets próprios.

### 6. 🛠️ Visões Táticas e de Campo (`/visits`, `/issues`)
- **Visitas Técnicas (`/visits`)**: Agendamento e checklist de visitas preventivas, corretivas e de inspeção.
- **Não Conformidades (`/issues`)**: Registro e acompanhamento de problemas técnicos e recomendações operacionais.

### 7. 🔒 Painel Administrativo e RBAC (`/admin/*`)
Gestão completa de acessos, papéis e auditoria (restrito a `SUPERADMIN` e `ADMIN`):
- **Controle de Acesso Granular (RBAC)**: Gerenciamento dinâmico de funções (`AccessRole`) e permissões (`Permission`).
- **Audit Logs**: Registro detalhado de ações administrativas e operacionais.
- **Gestão de Usuários e Localidades**: Criação, ativação/desativação e atribuição de setores/prédios/salas.

---

## 🛡️ Autenticação, RBAC & Segurança

### Roles Nativas (`Role`)
1. `SUPERADMIN`: Acesso irrestrito e controle total do ambiente.
2. `ADMIN`: Gestão administrativa, usuários, configurações e auditoria.
3. `MANAGER`: Operação tática, gestão de inventário e chamados.
4. `TECHNICIAN`: Resolução de chamados, visitas de campo, uso do Lens e relatórios.
5. `VIEWER`: Acesso de visualização de relatórios e dashboards.
6. `USUARIO`: Papel simplificado para usuários finais (restrito à abertura e consulta de seus próprios tickets).

### Segurança e Hardening
- Autenticação por **JWT** com tempo de expiração configurável.
- **Proteção contra Brute-Force**: Limitação de taxa de requisições (`express-rate-limit`) configurada para autenticação, onboarding e rotas globais.
- **Recuperação de Senha Segura**: Tokens temporários armazenados como hash em banco (`PasswordResetToken`) com envio de e-mail via Nodemailer/SMTP.
- **Segurança de Cabeçalhos**: Proteção via `helmet` e `cors` restritivo.

> ⚠️ **Aviso Importante de Segurança**: O arquivo `.env` NUNCA deve ser commitado no repositório. O repositório contém apenas `.env.example` com placeholders sanitizados.

---

## 📧 Configuração do Arquivo `.env`

Crie o arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
# Banco de Dados
DATABASE_URL="postgresql://infrafield_user:infrafield_password@localhost:5432/infrafield_db?schema=public"

# Autenticação
JWT_SECRET="seu_jwt_secret_super_seguro_aqui"
JWT_EXPIRES_IN="7d"

# Servidor API
PORT=3333
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"

# Configuração SMTP (Recuperação de Senha)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu_usuario_smtp"
SMTP_PASSWORD="sua_senha_smtp"
SMTP_FROM_NAME="InfraField Support"
SMTP_FROM_EMAIL="suporte@infrafield.local"

# Integração WhatsApp (Evolution API)
EVOLUTION_SERVER_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua_api_key_evolution"
EVOLUTION_INSTANCE_NAME="infrafield"
```

---

## 🚀 Execução e Instalação Local

### Pré-requisitos
- **Node.js**: v20+
- **npm**: v10+
- **Docker** & **Docker Compose**

### Passos para Instalação

1. **Clonar o repositório e instalar dependências:**
   ```bash
   git clone https://github.com/usuario/infrafield.git
   cd infrafield
   npm install
   ```

2. **Iniciar o banco PostgreSQL via Docker Compose:**
   ```bash
   docker compose up -d postgres
   ```
   *(Opcional: Descomente os serviços da Evolution API no `docker-compose.yml` caso queira testar a integração do WhatsApp em ambiente local).*

3. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```

4. **Executar Migrações e Seed do Banco de Dados:**
   ```bash
   npm --workspace=apps/api run prisma:generate
   npm --workspace=apps/api run prisma:migrate
   npm --workspace=apps/api run prisma:seed
   ```

5. **Iniciar o ambiente de desenvolvimento:**
   ```bash
   npm run dev
   ```
   - **Frontend Web**: `http://localhost:5173`
   - **Backend API**: `http://localhost:3333/api/health`

### Scripts Principais

```bash
# Executar backend e frontend em paralelo
npm run dev

# Build de produção do monorepo
npm run build

# Scripts utilitários da API (apps/api)
npm --workspace=apps/api run categories:ensure-defaults
npm --workspace=apps/api run test:lens
npm --workspace=apps/api run test:network-discovery
```

---

## 📁 Estrutura de Diretórios do Monorepo

```text
infrafield/
├── apps/
│   ├── api/                     # Backend Express, Prisma, Servicos NOC e OCR
│   │   ├── prisma/              # Schema, migrations e seeds do Prisma
│   │   ├── scripts/             # Scripts utilitarios e testes de CLI
│   │   └── src/
│   │       ├── controllers/     # Logica dos endpoints
│   │       ├── middlewares/     # Auth, RBAC e Rate Limiters
│   │       ├── routes/          # Definicao de rotas REST
│   │       └── services/        # Engine de rede, poller, WhatsApp e OCR
│   └── web/                     # Frontend React 18, Vite, Tailwind CSS e PWA
│       └── src/
│           ├── components/      # UI Layouts, Modais e Componentes reutilizaveis
│           ├── contexts/        # Contextos de Autenticacao e Tema
│           ├── pages/           # Paginas da aplicacao NOC e Admin Backoffice
│           └── services/        # Clientes Axios e WebSockets (Socket.io)
├── docker-compose.yml           # PostgreSQL e servicos auxiliares (Evolution API)
├── package.json                 # Workspaces e scripts raiz
└── .env.example                 # Modelo de variaveis de ambiente
```

---
*InfraField — Infraestrutura, Redes e Gestão Técnica de Qualidade.*
