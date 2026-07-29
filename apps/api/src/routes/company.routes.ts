import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const companyRouter = Router();

const CreateCompanySchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
});

// GET /api/companies - List companies
companyRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { locations: true, assets: true, visits: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return res.json(companies);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar empresas' });
  }
});

// POST /api/companies - Create company
companyRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const company = await prisma.company.create({
      data: parsed.data,
    });
    return res.status(201).json(company);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar empresa' });
  }
});
