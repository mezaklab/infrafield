import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';

export const locationRouter = Router();

const LocationWriteSchema = z.object({
  name: z.string().min(2, 'Nome do local é obrigatório'),
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  companyId: z.string().optional(),
  parentId: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
});

const LocationPatchSchema = z.object({
  name: z.string().min(2).optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  parentId: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
});

// ─── Public: GET /api/locations ───────────────────────────────────────────────
// Needed by /onboard page which is unauthenticated (PowerShell / field technicians).
locationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const where: Prisma.LocationWhereInput = {};
    if (req.query.companyId) {
      where.companyId = String(req.query.companyId);
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        _count: { select: { assets: true, visits: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json(locations);
  } catch (error) {
    console.error('[LOCATIONS] GET error:', error);
    return res.status(500).json({ error: 'Erro ao buscar localizações' });
  }
});

// ─── Protected writes — require valid JWT ────────────────────────────────────

// POST /api/locations
locationRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = LocationWriteSchema.safeParse(req.body);
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

    const parentId = parsed.data.parentId || parsed.data.parent_id || null;

    const location = await prisma.location.create({
      data: {
        name: parsed.data.name,
        building: parsed.data.building,
        floor: parsed.data.floor,
        room: parsed.data.room,
        parentId: parentId || null,
        companyId,
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(location);
  } catch (error) {
    console.error('[LOCATIONS] POST error:', error);
    return res.status(500).json({ error: 'Erro ao criar localização' });
  }
});

// PATCH /api/locations/:id
locationRouter.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = LocationPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const parentId = parsed.data.parentId !== undefined ? parsed.data.parentId : (parsed.data.parent_id !== undefined ? parsed.data.parent_id : undefined);

    const dataToUpdate: any = {
      name: parsed.data.name,
      building: parsed.data.building,
      floor: parsed.data.floor,
      room: parsed.data.room,
    };

    if (parentId !== undefined) {
      dataToUpdate.parentId = parentId || null;
    }

    const updated = await prisma.location.update({
      where: { id },
      data: dataToUpdate,
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
      },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[LOCATIONS] PATCH error:', error);
    if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
      return res.status(404).json({ error: 'Localização não encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar localização' });
  }
});

// DELETE /api/locations/:id — ADMIN or above only
locationRouter.delete(
  '/:id',
  requireAuth,
  requireRole([Role.SUPERADMIN, Role.ADMIN, Role.MANAGER]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.location.delete({ where: { id } });
      return res.json({ success: true, message: 'Localização removida com sucesso' });
    } catch (error) {
      console.error('[LOCATIONS] DELETE error:', error);
      if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
        return res.status(404).json({ error: 'Localização não encontrada' });
      }
      return res.status(500).json({ error: 'Erro ao excluir localização' });
    }
  }
);
