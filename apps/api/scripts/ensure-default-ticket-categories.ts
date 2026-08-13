import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { ensureDefaultTicketCategories } from '../src/services/ticket-category.service';

async function main(): Promise<void> {
  const categories = await ensureDefaultTicketCategories();
  console.table(categories);
}

main()
  .catch((error) => {
    console.error('[CATEGORIES] Falha ao garantir categorias padrão:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
