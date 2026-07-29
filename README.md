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

---

### 📄 Licença
Desenvolvido para auditoria e gestão inteligente de infraestruturas de TI e Redes.
