import { prisma } from '../lib/prisma';

const categoryStore = prisma.category as any;

export const DEFAULT_TICKET_CATEGORIES = [
  'Computador',
  'Notebook',
  'Wi-Fi / Internet',
  'Impressora',
  'Outros',
] as const;

/** Ensures every company has the standard ticket categories without deleting user data. */
export async function ensureDefaultTicketCategories(companyId?: string): Promise<Array<{ id: string; name: string; companyId: string; created: boolean }>> {
  const result: Array<{ id: string; name: string; companyId: string; created: boolean }> = [];
  const companies = companyId
    ? [{ id: companyId }]
    : await prisma.company.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } });

  for (const company of companies) {
    for (const name of DEFAULT_TICKET_CATEGORIES) {
      const existing = await categoryStore.findFirst({
        where: { companyId: company.id, name: { equals: name, mode: 'insensitive' } },
        select: { id: true, name: true, companyId: true },
      });

      if (existing) {
        result.push({ ...existing, created: false });
        continue;
      }

      const created = await categoryStore.create({
        data: { name, companyId: company.id },
        select: { id: true, name: true, companyId: true },
      });
      result.push({ ...created, created: true });
    }
  }

  return result;
}
