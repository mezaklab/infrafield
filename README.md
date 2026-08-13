# 🌐 InfraField NOC — Plataforma de Gestão de Infraestrutura & Operações de Campo (v1.0)

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.19-lightgrey?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5.19-indigo?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![PWA](https://img.shields.io/badge/PWA-Offline--Ready-orange?logo=pwa)
![PDFKit](https://img.shields.io/badge/PDFKit-Report--Engine-[#00f2fe])

**InfraField** é uma solução corporativa monorepo projetada para Centros de Operações de Rede (NOC), engenheiros de telecomunicações e técnicos de TI. A plataforma combina monitoramento de ativos de infraestrutura em tempo real, auditorias em campo com suporte offline via PWA, leitura de QR Code/Patrimônio via câmera HTML5, checklists dinâmicos, gestão de não conformidades e geração automática de relatórios executivos em PDF e CSV.

---

## ⚡ Principais Funcionalidades (v1.0)

### 📊 1. Painel NOC Executivo (Dashboard)
- **Saúde Global da Frota (%)**: Indicadores visuais de operabilidade, manutenção e falhas críticas.
- **Conciliação de Inventário (%)**: Comparativo em tempo real de ativos esperados vs. localizados em vistoria.
- **Distribuição Tecnológica**: Gráficos de barras em Tailwind CSS por categoria (*Servidores*, *Switches*, *Firewalls*, *Storage*, *Wi-Fi*).
- **Telemetria de API em Tempo Real**: Indicador de conexão backend com pulso LED `200 OK`.

### 🖼️ 2. Catálogo de Ativos com Renderização Realista
- **Fotos Transparentes de Equipamentos**: Modelos isolados e realistas sem moldura para *Cisco Catalyst*, *Fortinet FortiGate*, *Dell PowerEdge*, *Dell PowerVault* e *Aruba AP-515*.
- **Pedestal Luminoso Neon Glow**: Iluminação ciano suave sob a base de cada equipamento no card.
- **Métricas Rápidas no Rodapé**: Exibição contextual de *CPU*, *RAM*, *Portas*, *Ping*, *Banda*, *IOPS*, *Temp* e *Sinal dBm*.

### 📱 3. Modo Vistoria Offline & Leitor de QR Code / Câmera HTML5
- **Resiliência Offline (PWA + Dexie.js)**: Fila IndexedDB com sincronização automática (`batch sync`) ao reconectar à internet.
- **Scanner de QR Code/Patrimônio**: Leitura em tempo real via `MediaDevices API` da câmera do dispositivo para confirmação instantânea de ativos em rack.
- **Captura e Compressão de Evidências**: Redimensionamento no browser em tempo real (máx 800px / JPEG 0.7) antes de enviar à API REST.

### 📋 4. Checklists Dinâmicos & Gestão de Não Conformidades (`/issues`)
- **Checklists Personalizáveis**: Respostas `YES_NO` (Conforme/Não Conforme), textos e medições por ativo.
- **Central de Ocorrências (`/issues`)**: Registro e acompanhamento de falhas com severidades (*Crítica*, *Alta*, *Média*, *Baixa*) e ações de transição rápida de status.

### 📄 5. Geração de Relatórios em PDF & Exportação CSV
- **Motor de PDF Integrado (`PDFKit`)**:
  - `GET /api/reports/visits/:visitId/pdf`: Relatório Técnico de Visita em PDF formatado com cabeçalho corporativo, dados do cliente, checklist e não conformidades.
  - `GET /api/reports/inventory/pdf`: Relatório em PDF do Inventário Geral de Ativos.
- **Exportação CSV Excel (`\uFEFF UTF-8 BOM`)**: Download imediato em uma única planilha estruturada de ativos (`GET /api/reports/assets/export`).

---

## 📁 Estrutura de Arquitetura Monorepo

```text
infrafield/
├── apps/
│   ├── web/                    # Frontend React 18 + Vite 5 + Tailwind CSS + PWA
│   │   ├── src/
│   │   │   ├── pages/          # Dashboard (NOC), Assets, Visits, Issues
│   │   │   ├── components/     # InspectionMode, QRScanner, PhotoCapture, Layout
│   │   │   ├── services/       # REST API Client & Dexie.js Offline Sync
│   │   │   └── types/          # Tipos TypeScript compartilhados
│   │   └── public/             # Service Worker (sw.js) & Web Manifest
│   │
│   └── api/                    # Backend Node.js + Express + Prisma ORM 5.19
│       ├── prisma/
│       │   ├── schema.prisma   # PostgreSQL Schema (Asset, Visit, Checklist, Issue)
│       │   └── seed.ts         # Script de carga inicial com ativos e checklists
│       └── src/
│           ├── routes/         # REST API Routes (Assets, Visits, Reports, Issues)
│           └── lib/            # Prisma Client singleton
├── docker-compose.yml          # Container PostgreSQL 16
├── package.json                # NPM Workspaces configuration
└── README.md                   # Documentação do projeto
```

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS, Lucide Icons, Dexie.js (IndexedDB), VitePWA.
- **Backend**: Node.js, Express, TypeScript, Zod, Prisma ORM 5, PDFKit, Multer.
- **Banco de Dados**: PostgreSQL 16 (Container Docker).

---

## 🚀 Como Executar o Projeto Localmente

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/usuario/infrafield.git
cd infrafield
npm install
```

### 2. Subir o Banco de Dados PostgreSQL via Docker
```bash
docker compose up -d postgres
```

### 3. Executar as Migrações e o Seed do Prisma
```bash
npm --workspace=apps/api run prisma:generate
npm --workspace=apps/api run prisma:seed
```

### 4. Iniciar os Servidores de Desenvolvimento (Monorepo)
```bash
npm run dev
```

- 🎨 **Painel NOC (Frontend Web / PWA)**: [http://localhost:5173](http://localhost:5173)
- 📡 **Backend API**: [http://localhost:3333/api/health](http://localhost:3333/api/health)

---

## 🧪 Validação de Build de Produção

Para validar a integridade dos tipos TypeScript e pacotes em todos os workspaces:
```bash
npm run build
```

## Monitoramento por MAC e IP dinâmico

O cadastro de ativos aceita MAC nos formatos com `:`, `-` ou Cisco (`0011.22AA.BBCC`) e persiste no formato canônico. O scanner local faz um único ping sweep por subnet autorizada, lê a tabela Linux `ip neigh`, associa todos os ativos pelo MAC e só então executa o health check ICMP. Encontrar o MAC não define o ativo como online.

Configure a API no host Linux que tenha acesso direto à LAN:

```env
NETWORK_DISCOVERY_MODE=local
DISCOVERY_SUBNETS=192.168.0.0/24,192.168.10.0/24
DISCOVERY_INTERVAL_SECONDS=30
OFFLINE_FAILURE_THRESHOLD=3
DEGRADED_LATENCY_MS=150
```

O modo padrão é `disabled`, para que desenvolvimento e instalações em VPS continuem funcionando sem acesso à LAN. `remote-agent` é reservado para um futuro provider; a API não tenta executar ARP nesse modo. O host local precisa disponibilizar os comandos Linux `ping` e `ip` (pacotes normalmente chamados `iputils-ping` e `iproute2`). Por segurança, apenas IPv4/CIDR validado é usado e subnets maiores que `/22` são rejeitadas.

Após configurar, aplique a migration e reinicie a API:

```bash
npm --workspace=apps/api run prisma:generate
npm --workspace=apps/api exec prisma migrate deploy
npm --workspace=apps/api run build
npm --workspace=apps/api run start
```

Cadastre um ativo com MAC, marque **Monitoramento automático** e acompanhe os logs `[NETWORK]`, `[DEVICE]`, `[HEALTH]` e `[IP_CHANGED]`. O histórico mais recente é retornado em `GET /api/assets/:id`. Uma troca de DHCP fecha (`lostAt`) o endereço anterior, cria exatamente um novo período e gera notificação informativa.

O mesmo ciclo atende ativos de infraestrutura e ativos de TI (computadores, notebooks, servidores, impressoras, scanners de rede, NAS/storage, thin clients, telefones/câmeras IP, nobreaks gerenciáveis e IoT). A categoria não decide disponibilidade: somente `monitoringEnabled=true` com MAC válido entra no poller. Ativos sem rede permanecem com monitoramento desativado e não são exibidos como offline. O status administrativo (`status`) é independente de `monitoringStatus`.

Nesta versão cada ativo possui um MAC principal. Equipamentos com Ethernet e Wi-Fi devem usar o MAC realmente visível na rede e escolhido como interface principal; suporte relacional a múltiplas interfaces fica reservado para a evolução `AssetNetworkInterface`. MAC privado/randomizado não é associado automaticamente.

## Bootstrap administrativo e limpeza operacional

O seed é idempotente e não cria dados de demonstração. Configure as credenciais somente no ambiente real:

```env
BOOTSTRAP_SUPERADMIN_USERNAME=
BOOTSTRAP_SUPERADMIN_PASSWORD=
BOOTSTRAP_SUPERADMIN_NAME=
BOOTSTRAP_SUPERADMIN_EMAIL=
```

Execute `npm --workspace=apps/api run prisma:seed`. Se o usuário já existir, seu cargo e estado ativo são garantidos, mas a senha não é redefinida.

A limpeza operacional exige confirmação explícita e preserva usuários desconhecidos, RBAC, configurações e templates:

```bash
BOOTSTRAP_SUPERADMIN_USERNAME=seu.usuario \
CONFIRM_CLEAR_OPERATIONAL_DATA=CLEAR_OPERATIONAL_DATA \
npm --workspace=apps/api run data:clear-demo
```

O backoffice disponibiliza **Cargos e Permissões**. `SUPERADMIN` é protegido e mantém todas as permissões; o cargo Técnico inicia com consulta de equipamentos/monitoramento/alertas, ordens atribuídas e execução de checklists, sem administração de usuários, cargos ou configurações.

---

### 📄 Licença
Desenvolvido para auditoria e gestão inteligente de infraestruturas de TI e Redes.
## InfraField Lens

O botão central da navegação mobile abre o **InfraField Lens**, que fotografa ou recebe uma imagem do ativo, executa OCR e leitura de QR/código de barras no backend e apresenta os dados para conferência humana. Nenhum ativo é salvo automaticamente. Equipamentos de rede são encaminhados ao cadastro de ativos monitoráveis; computadores, notebooks, monitores, impressoras e scanners usam o cadastro de ativos de TI já existente.

Configuração padrão (sem serviço externo):

```env
ASSET_OCR_PROVIDER=local-tesseract
ASSET_OCR_LANGUAGES=eng
ASSET_BARCODE_PROVIDER=local-zxing
ASSET_VISION_PROVIDER=disabled
ASSET_LENS_MAX_IMAGE_MB=8
```

Para integrar um provedor de visão sem acoplar o InfraField a um fornecedor, configure `ASSET_VISION_PROVIDER=http` e `ASSET_VISION_ENDPOINT`. O endpoint recebe `POST` JSON com `{ image, mimeType }`, em que `image` é Base64, e deve devolver os campos no formato de evidência `{ value, source: "VISION", confidence }`. `ASSET_VISION_API_KEY`, quando definido, é enviado apenas pelo backend como Bearer token. Imagens não são enviadas externamente no modo padrão.

O endpoint protegido `POST /api/lens/recognize` aceita `multipart/form-data` com `image` e, opcionalmente, `labelImage`. `POST /api/lens/duplicates` compara serial/Service Tag, MAC e patrimônio com os cadastros existentes. A câmera requer HTTPS (ou localhost); seleção da galeria permanece disponível como alternativa.
