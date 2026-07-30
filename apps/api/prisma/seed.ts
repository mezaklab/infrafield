import { 
  PrismaClient, 
  Role, 
  AssetStatus, 
  VisitStatus, 
  VisitAssetStatus, 
  VisitPriority, 
  VisitType,
  ChecklistFieldType,
  IssueSeverity,
  IssueStatus
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting InfraField v0.4 Database Seeding...');

  const HASH_ROUNDS = 10;
  const adminPasswordHash = await bcrypt.hash('admin123', HASH_ROUNDS);
  const techPasswordHash = await bcrypt.hash('tecnico123', HASH_ROUNDS);
  const managerPasswordHash = await bcrypt.hash('gestor123', HASH_ROUNDS);
  const viewerPasswordHash = await bcrypt.hash('viewer123', HASH_ROUNDS);


  // Clean existing tables in reverse order of foreign keys
  await prisma.issue.deleteMany();
  await prisma.checklistResponse.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.visitAsset.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // 1. Create Company
  const company = await prisma.company.create({
    data: {
      name: 'TechCorp Infraestrutura S.A.',
      cnpj: '45.678.901/0001-33',
    },
  });
  console.log('✅ 1 Company created:', company.name);

  // 2. Create Locations
  const location1 = await prisma.location.create({
    data: {
      name: 'Datacenter Principal',
      building: 'Prédio A',
      floor: '2º Andar',
      room: 'Sala de Servidores 204',
      companyId: company.id,
    },
  });

  const location2 = await prisma.location.create({
    data: {
      name: 'Escritório Central - Rack TI',
      building: 'Prédio B',
      floor: '1º Andar',
      room: 'Rack de Telecom 101',
      companyId: company.id,
    },
  });
  console.log('✅ 2 Locations created:', [location1.name, location2.name].join(', '));

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador InfraField',
      email: 'admin@infrafield.io',
      password: adminPasswordHash,
      role: Role.ADMIN,
      companyId: company.id,
    },
  });

  const tech = await prisma.user.create({
    data: {
      name: 'Carlos Silva (Técnico)',
      email: 'carlos.silva@infrafield.io',
      password: techPasswordHash,
      role: Role.TECHNICIAN,
      companyId: company.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Mariana Costa (Gerente)',
      email: 'mariana.costa@infrafield.io',
      password: managerPasswordHash,
      role: Role.MANAGER,
      companyId: company.id,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: 'Lucas Andrade (Auditor)',
      email: 'lucas.andrade@infrafield.io',
      password: viewerPasswordHash,
      role: Role.VIEWER,
      companyId: company.id,
    },
  });
  console.log('✅ Users created.');

  // 4. Create 5 TI/Redes Assets
  const asset1 = await prisma.asset.create({
    data: {
      code: 'SW-CORE-01',
      name: 'Switch Core Cisco Catalyst 9300 48P',
      assetTag: 'PAT-00101',
      serialNumber: 'SN-9300-88A99',
      hostname: 'sw-core-01.techcorp.local',
      ipAddress: '192.168.1.1',
      category: 'Redes & Switches',
      status: AssetStatus.OPERATIONAL,
      locationId: location1.id,
      companyId: company.id,
      assignedToId: tech.id,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      code: 'FW-EDGE-01',
      name: 'Firewall Fortinet FortiGate 100F',
      assetTag: 'PAT-00102',
      serialNumber: 'FG100F-992B44',
      hostname: 'fw-edge-01.techcorp.local',
      ipAddress: '192.168.1.254',
      category: 'Segurança & Firewalls',
      status: AssetStatus.OPERATIONAL,
      locationId: location1.id,
      companyId: company.id,
      assignedToId: tech.id,
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      code: 'SRV-VM-01',
      name: 'Servidor Dell PowerEdge R750 VMware',
      assetTag: 'PAT-00103',
      serialNumber: 'DELL-R750-X110',
      hostname: 'srv-vm-01.techcorp.local',
      ipAddress: '192.168.1.10',
      category: 'Servidores',
      status: AssetStatus.OPERATIONAL,
      locationId: location1.id,
      companyId: company.id,
      assignedToId: tech.id,
    },
  });

  const asset4 = await prisma.asset.create({
    data: {
      code: 'SAN-STOR-01',
      name: 'Storage Dell PowerVault ME5024',
      assetTag: 'PAT-00104',
      serialNumber: 'PV-SAN-77412',
      hostname: 'san-stor-01.techcorp.local',
      ipAddress: '192.168.1.50',
      category: 'Storage & Armazenamento',
      status: AssetStatus.MAINTENANCE,
      locationId: location1.id,
      companyId: company.id,
      assignedToId: tech.id,
    },
  });

  const asset5 = await prisma.asset.create({
    data: {
      code: 'AP-WIFI-01',
      name: 'Access Point Wi-Fi 6 Aruba AP-515',
      assetTag: 'PAT-00105',
      serialNumber: 'ARUBA-AP515-099',
      hostname: 'ap-wifi-01.techcorp.local',
      ipAddress: '192.168.1.100',
      category: 'Redes Sem Fio',
      status: AssetStatus.OPERATIONAL,
      locationId: location2.id,
      companyId: company.id,
      assignedToId: tech.id,
    },
  });
  console.log('✅ 5 Assets created.');

  // 5. Create Visits
  const visit1 = await prisma.visit.create({
    data: {
      protocol: 'VIS-2026-001',
      client: company.name,
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      status: VisitStatus.EM_ANDAMENTO,
      priority: VisitPriority.ALTA,
      type: VisitType.INSPECAO,
      scheduledDate: new Date('2026-07-28T09:00:00Z'),
      scheduledTime: '09:00 - 12:00',
      startedAt: new Date('2026-07-28T09:15:00Z'),
      notes: 'Auditoria de inventário e saúde física dos ativos do Datacenter Principal',
      companyId: company.id,
      locationId: location1.id,
      technicianId: tech.id,
    },
  });

  const visit2 = await prisma.visit.create({
    data: {
      protocol: 'VIS-2026-002',
      client: company.name,
      address: 'Rua Funchal, 418 - Vila Olímpia, São Paulo - SP',
      status: VisitStatus.PLANEJADA,
      priority: VisitPriority.MEDIA,
      type: VisitType.PREVENTIVA,
      scheduledDate: new Date('2026-07-29T14:00:00Z'),
      scheduledTime: '14:00 - 17:00',
      notes: 'Inspeção preventiva periódica nos equipamentos de redes do Escritório Central',
      companyId: company.id,
      locationId: location2.id,
      technicianId: tech.id,
    },
  });

  await prisma.visitAsset.createMany({
    data: [
      {
        visitId: visit1.id,
        assetId: asset1.id,
        status: VisitAssetStatus.ENCONTRADO,
        notes: 'Switch verificado e operando 100%.',
        checkedAt: new Date(),
      },
      {
        visitId: visit1.id,
        assetId: asset2.id,
        status: VisitAssetStatus.ENCONTRADO,
        notes: 'Firewall responsivo. Firmware OK.',
        checkedAt: new Date(),
      },
      {
        visitId: visit1.id,
        assetId: asset3.id,
        status: VisitAssetStatus.ESPERADO,
      },
      {
        visitId: visit1.id,
        assetId: asset4.id,
        status: VisitAssetStatus.AUSENTE,
        notes: 'Storage retirado para manutenção externa.',
        checkedAt: new Date(),
      },
      {
        visitId: visit2.id,
        assetId: asset5.id,
        status: VisitAssetStatus.ESPERADO,
      },
    ],
  });

  // 6. Create 1 ChecklistTemplate for Rack/Servidor with 5 items
  const template = await prisma.checklistTemplate.create({
    data: {
      name: 'Checklist de Inspeção de Rack & Servidores',
      description: 'Verificação operacional padrão de climatização, alimentação redundante, cabeamento e ventilação',
      category: 'TI & Redes',
      isActive: true,
      items: {
        create: [
          {
            label: 'Alimentação elétrica redundante (PDU A e PDU B) conectada e sem alertas?',
            fieldType: ChecklistFieldType.YES_NO,
            isRequired: true,
            order: 1,
          },
          {
            label: 'Temperatura ambiente na sala/rack mantida abaixo de 22°C?',
            fieldType: ChecklistFieldType.YES_NO,
            isRequired: true,
            order: 2,
          },
          {
            label: 'Cabos de patch cord e fibra devidamente organizados e etiquetados?',
            fieldType: ChecklistFieldType.YES_NO,
            isRequired: false,
            order: 3,
          },
          {
            label: 'Estado geral de operação das ventoinhas e ruído mecânico do rack',
            fieldType: ChecklistFieldType.SELECT,
            options: JSON.stringify(['Normal / Silencioso', 'Ruído Elevado', 'Ruído Crítico / Vibração']),
            isRequired: false,
            order: 4,
          },
          {
            label: 'Evidência fotográfica do painel frontal do rack',
            fieldType: ChecklistFieldType.PHOTO,
            isRequired: false,
            order: 5,
          },
        ],
      },
    },
    include: { items: true },
  });
  console.log('✅ 1 ChecklistTemplate created with', template.items.length, 'items.');

  // 7. Create 2 Sample Issues (Não Conformidades)
  const issue1 = await prisma.issue.create({
    data: {
      protocol: 'INC-2026-001',
      title: 'Aquecimento excessivo no exaustor superior do Rack 02',
      description: 'A ventoinha superior do rack está apresentando vibração atípica e temperatura de exaustão de 34°C.',
      severity: IssueSeverity.HIGH,
      status: IssueStatus.OPEN,
      recommendation: 'Substituir o exaustor de teto e inspecionar o duto de ar condicionado de precisão.',
      companyId: company.id,
      locationId: location1.id,
      assetId: asset1.id,
      visitId: visit1.id,
      reportedById: tech.id,
    },
  });

  const issue2 = await prisma.issue.create({
    data: {
      protocol: 'INC-2026-002',
      title: 'Cabo de fibra óptica sem identificação na porta 24 do Switch Core',
      description: 'Patch cord de fibra conectando a porta 24 do switch SW-CORE-01 não possui anilha nem etiqueta de patrimônio.',
      severity: IssueSeverity.MEDIUM,
      status: IssueStatus.IN_ANALYSIS,
      recommendation: 'Identificar a porta no DIO e etiquetar o cabo de acordo com o padrão corporativo.',
      companyId: company.id,
      locationId: location1.id,
      assetId: asset1.id,
      visitId: visit1.id,
      reportedById: tech.id,
    },
  });
  // 8. Create Sample Notifications
  await prisma.notification.deleteMany();
  await prisma.notification.createMany({
    data: [
      {
        title: '🚨 Alerta de Falha ICMP: SAN-STOR-01',
        message: 'O equipamento Storage Dell PowerVault ME5024 (192.168.1.50) parou de responder ao ping e entrou em estado CRÍTICO.',
        type: 'ALERT',
        isRead: false,
        assetId: asset4.id,
      },
      {
        title: '⚠️ Temperatura Elevada no Datacenter',
        message: 'Sensor de exaustão do Rack 02 registrou 34°C. Recomendada vistoria imediata.',
        type: 'WARNING',
        isRead: false,
        assetId: asset1.id,
      },
      {
        title: '🟢 Sincronização em Tempo Real Ativa',
        message: 'Conexão WebSocket Socket.IO estabelecida com sucesso no Centro de Operações de Rede.',
        type: 'SUCCESS',
        isRead: true,
      },
    ],
  });
  console.log('✅ 3 Notifications created.');
  console.log('🎉 Seeding v0.4 completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
