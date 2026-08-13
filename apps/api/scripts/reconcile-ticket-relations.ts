import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main(): Promise<void> {
  await prisma.$executeRawUnsafe('ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT \'Outros\'');
  await prisma.$executeRawUnsafe('ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "categoryId" TEXT');
  await prisma.$executeRawUnsafe('ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "sector_id" TEXT');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "tickets_category_id_idx" ON "tickets"("categoryId")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "tickets_sector_id_idx" ON "tickets"("sector_id")');
  await prisma.$executeRawUnsafe(`
    DO $reconcile$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_categoryId_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey"
          FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_sector_id_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_sector_id_fkey"
          FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $reconcile$
  `);
  console.log('Ticket schema reconciliado com segurança.');
}

main()
  .catch((error) => {
    console.error('[TICKETS] Falha ao reconciliar schema:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
