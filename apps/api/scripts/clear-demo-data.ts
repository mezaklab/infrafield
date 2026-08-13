import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_USERNAMES = [
  'superadmin.geral', 'administrador.infrafield', 'tecnico.dev',
  'carlos.tecnico', 'mariana.gerente', 'lucas.auditor',
];

async function main(): Promise<void> {
  if (process.env.CONFIRM_CLEAR_OPERATIONAL_DATA !== 'CLEAR_OPERATIONAL_DATA') {
    throw new Error('Defina CONFIRM_CLEAR_OPERATIONAL_DATA=CLEAR_OPERATIONAL_DATA para confirmar a limpeza operacional.');
  }
  const bootstrapUsername = process.env.BOOTSTRAP_SUPERADMIN_USERNAME?.trim().toLowerCase();
  if (!bootstrapUsername) throw new Error('BOOTSTRAP_SUPERADMIN_USERNAME é obrigatório para proteger o acesso administrativo.');

  await prisma.$transaction(async (tx) => {
    await tx.ticketMessage.deleteMany();
    await tx.ticket.deleteMany();
    await tx.checklistResponse.deleteMany();
    await tx.visitAsset.deleteMany();
    await tx.issue.deleteMany();
    await tx.visit.deleteMany();
    await tx.deviceIpHistory.deleteMany();
    await tx.notification.deleteMany();
    await tx.asset.deleteMany();
    await tx.peripheral.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.user.updateMany({ data: { locationId: null } });
    await tx.location.deleteMany();
    await tx.user.deleteMany({ where: { username: { in: DEMO_USERNAMES }, NOT: { username: bootstrapUsername } } });
    await tx.company.updateMany({
      where: { name: 'TechCorp Infraestrutura S.A.', cnpj: '45.678.901/0001-33' },
      data: { name: process.env.BOOTSTRAP_COMPANY_NAME?.trim() || 'InfraField', cnpj: null },
    });
  }, { timeout: 60_000 });

  const counts = await Promise.all([
    prisma.asset.count(), prisma.peripheral.count(), prisma.ticket.count(), prisma.visit.count(),
    prisma.issue.count(), prisma.notification.count(), prisma.deviceIpHistory.count(),
  ]);
  console.log(`[CLEANUP] Concluído. ativos=${counts[0]} periféricos=${counts[1]} ordens=${counts[2]} visitas=${counts[3]} ocorrências=${counts[4]} notificações=${counts[5]} históricoIp=${counts[6]}`);
}

main()
  .catch((error) => { console.error('[CLEANUP] Falha:', error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
