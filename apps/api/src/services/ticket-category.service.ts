import { prisma } from '../lib/prisma';

export const DEFAULT_TICKET_CATEGORIES = [
  'Computador',
  'Notebook',
  'Wi-Fi / Internet',
  'Impressora',
  'Outros',
] as const;

/** Ensures the installation has the standard ticket categories without deleting user data. */
export async function ensureDefaultTicketCategories(): Promise<Array<{ id: string; name: string; created: boolean }>> {
  const result: Array<{ id: string; name: string; created: boolean }> = [];

  for (const name of DEFAULT_TICKET_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });

    if (existing) {
      result.push({ ...existing, created: false });
      continue;
    }

    const created = await prisma.category.create({
      data: { name },
      select: { id: true, name: true },
    });
    result.push({ ...created, created: true });
  }

  return result;
}
