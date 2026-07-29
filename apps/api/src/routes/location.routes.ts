import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const locationRouter = Router();

const CreateLocationSchema = z.object({
  name: z.string().min(2, 'Nome do local é obrigatório'),
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  companyId: z.string().optional(),
});

// GET /api/locations - List locations
locationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    const where: any = {};
    if (companyId) {
      where.companyId = String(companyId);
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { assets: true, visits: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json(locations);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar localizações' });
  }
});

// POST /api/locations - Create location
locationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    let companyId = parsed.data.companyId;
    if (!companyId) {
      const company = await prisma.company.findFirst();
      if (!company) {
        return res.status(400).json({ error: 'Nenhuma empresa cadastrada no sistema' });
      }
      companyId = company.id;
    }

    const location = await prisma.location.create({
      data: {
        name: parsed.data.name,
        building: parsed.data.building,
        floor: parsed.data.floor,
        room: parsed.data.room,
        companyId,
      },
    });

    return res.status(201).json(location);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar localização' });
  }
});
