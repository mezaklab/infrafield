import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_expiresAt_idx" ON "password_reset_tokens"("userId", "expiresAt")');
  await prisma.$executeRawUnsafe(`
    DO $reset$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_userId_fkey') THEN
        ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
      END IF;
    END $reset$
  `);
  console.log('Tabela password_reset_tokens reconciliada com segurança.');
}

main()
  .catch((error) => {
    console.error('[PASSWORD_RESET] Falha ao reconciliar tabela:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
