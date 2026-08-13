import 'dotenv/config';
import { ensureBootstrapSuperAdmin } from '../src/services/bootstrap.service';
import { prisma } from '../src/lib/prisma';
import { ensureDefaultTicketCategories } from '../src/services/ticket-category.service';

async function main(): Promise<void> {
  const categories = await ensureDefaultTicketCategories();
  categories.forEach((category) => console.log(`[SEED] Categoria ${category.created ? 'criada' : 'já existente'}: ${category.name} (${category.id})`));
  const result = await ensureBootstrapSuperAdmin();
  console.log(`[BOOTSTRAP] RBAC pronto; Super Admin ${result.created ? 'criado' : 'já existente'} (${result.username}).`);
}

main()
  .catch((error) => {
    console.error('[BOOTSTRAP] Falha:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
