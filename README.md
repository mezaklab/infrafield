# 🌐 InfraField NOC — Plataforma de Gestão de Infraestrutura & Operações de Campo

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18.3-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.4-purple?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.19-lightgrey?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5.19-indigo?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![PWA](https://img.shields.io/badge/PWA-Offline--Ready-orange?logo=pwa)

**InfraField** é uma plataforma corporativa monorepo focada em gestão de infraestrutura de TI, Centro de Operações de Rede (NOC), inventário de ativos, monitoramento de conectividade, Helpdesk e suporte a operações de campo.

---

## 🏗️ Arquitetura

O projeto adota uma arquitetura em **Monorepo** com os seguintes componentes principais:

- **Frontend (`apps/web`)**: React 18, TypeScript, Vite 6, Tailwind CSS, e suporte PWA para operação em dispositivos móveis e desktops.
- **Backend (`apps/api`)**: Node.js, Express, TypeScript, focado em alta escalabilidade, websockets (Socket.io) para atualizações em tempo real e integração OCR local.
- **Banco de Dados e ORM**: PostgreSQL estruturado e manipulado via Prisma ORM 5.19.

---

## 📡 Monitoramento de Infraestrutura

O sistema de monitoramento de disponibilidade (NOC) opera sob um fluxo focado na identificação física do dispositivo pela rede, garantindo que o rastreio persista mesmo com alterações de IP (DHCP dinâmico). 

**Fluxo atual**:
1. MAC cadastrado e habilitado para monitoramento.
2. **Network Discovery**: Varredura (ping sweep/ARP local) na sub-rede autorizada.
3. Descoberta do IP atual associado ao MAC via tabela de vizinhos do sistema.
4. **ICMP Health Check**: Disparo de ping para o IP recém descoberto.
5. Retorno de **status (online/offline)** e latência do ativo na dashboard.

*Nota: O simples fato do MAC constar na tabela local não define o ativo como "online" ou saudável, dependendo estritamente do Health Check subsequente.*

---

## 🔍 InfraField Lens

O InfraField Lens é a ferramenta assistiva integrada de campo para identificação de ativos físicos. As funcionalidades atuais incluem:

- Captura ou upload de imagens de equipamentos ou etiquetas.
- Reconhecimento óptico de caracteres (OCR) operando de forma embutida e local.
- Identificação assistida de equipamentos (Serial Number, Modelo, Fabricante, MAC, Patrimônio/Asset Tag).
- Tela de confirmação manual e revisão dos dados pelo técnico.
- Importação direta para a tela de criação ou atualização do cadastro do ativo.

---

## 📦 Inventário e Ativos

O catálogo unifica o inventário de equipamentos corporativos, suportando atualmente:
- Equipamentos de rede (Roteadores, Switches, Access Points, Firewalls)
- Computadores e Notebooks
- Servidores e Storage/NAS
- Monitores, Impressoras e Scanners de rede
- Periféricos diversos suportados no módulo de TI.

---

## 🎫 Helpdesk e Chamados

A plataforma suporta o ciclo de vida de tickets de suporte estruturados:
- Abertura de chamados com níveis de **Prioridade** e **Status** de atendimento.
- Associação vinculada a **Categoria**, **Setor** (área) e **Localização** (espaço físico).
- Envio de **anexos** visuais ou documentos.
- Atribuição a um **Técnico** responsável.

### Categorias Padrão
O sistema inicia configurado com as seguintes categorias básicas (expansíveis por administradores):
- `Computador`
- `Notebook`
- `Wi-Fi / Internet`
- `Impressora`
- `Outros`

---

## 🏢 Setores e Localidades

O InfraField separa conceitualmente a estrutura organizacional da infraestrutura predial:
- **Setor**: Unidade administrativa, centro de custo ou departamento (Ex: "Recursos Humanos", "Obras").
- **Localização**: Espaço físico, prédio ou sala específica (Ex: "Prédio Central", "Sala 204").
Ambos são associáveis individualmente nos tickets e ativos.

---

## 🛡️ Autenticação, Segurança e RBAC

A autenticação é validada via **JWT** (JSON Web Token). 

### Controle de Acesso (RBAC)
Os seguintes níveis de permissões estão definidos:
- **`SUPERADMIN`**: Acesso total a todas as entidades, configurações de segurança e exclusão estrutural.
- **`ADMIN`**: Gestão administrativa, exceto ações destrutivas avançadas ou modificação de outros admins/superadmins.
- **`MANAGER`**: Gestão diária de ativos, chamados e operações táticas.
- **`TECHNICIAN`**: Visão de campo operacional, resolução de chamados, uso do Lens e relatórios.
- **`VIEWER`**: Acesso de leitura.

### Recuperação de Senha
- Geração de token de recuperação de senha temporário, salvo como *hash* no banco (uso único e com expiração).
- Envio do link por e-mail via **SMTP** configurável através das variáveis de ambiente.

> ⚠️ **Aviso de Segurança Crítico**: NUNCA commite o arquivo `.env` ou inclua credenciais, segredos, chaves de API, senhas reais ou `DATABASE_URL` no código-fonte. O arquivo `.env` é devidamente ignorado via `.gitignore`. 

---

## 📧 Configuração Genérica de SMTP

Para o funcionamento do serviço de e-mail e recuperação de senha, configure as seguintes variáveis no seu `.env` local ou no servidor:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=InfraField
SMTP_FROM_EMAIL=
```
Consulte o arquivo `.env.example` para as referências estruturais e crie seu `.env` com valores reais.

---

## 🎨 Tema e Interface

O Design System conta com suporte para:
- **Light Mode** e **Dark Mode** (persistidos na configuração do usuário).
- Design 100% **Responsivo** (Desktop, Tablet e Smartphone).
- Suporte a **PWA** permitindo instalação como aplicativo nativo e cache de recursos.

---

## 🚀 Execução Local

### Pré-requisitos
- Node.js 20+
- Docker (para o banco de dados)

### Passos de instalação

1. **Clone o repositório e instale as dependências root e dos workspaces:**
   ```bash
   git clone https://github.com/usuario/infrafield.git
   cd infrafield
   npm install
   ```

2. **Suba o banco de dados PostgreSQL (container local):**
   ```bash
   docker compose up -d postgres
   ```

3. **Configure as credenciais:**
   Copie o `.env.example` para `.env` e ajuste se necessário. O banco local já está pré-configurado no compose.
   ```bash
   cp .env.example .env
   ```

4. **Prepare o Prisma ORM:**
   ```bash
   npm --workspace=apps/api run prisma:generate
   npm --workspace=apps/api run prisma:seed
   ```

5. **Inicie os servidores em modo desenvolvimento:**
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3333/api/health`

### Build para Produção
```bash
npm run build
```

---

## 📁 Estrutura do Monorepo

```text
infrafield/
├── apps/
│   ├── web/                    # Frontend React/Vite
│   └── api/                    # Backend Express + OCR Lens + Serviços de Rede
│       ├── prisma/             # Schema do Prisma ORM
│       └── src/                # Controllers, Routers e Core
├── docker-compose.yml          # Container Database
└── package.json                # NPM Workspaces setup
```

---
*InfraField — Infraestrutura, Redes e Gestão Técnica de Qualidade.*
