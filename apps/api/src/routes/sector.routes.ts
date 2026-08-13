import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireRole } from '../middlewares/auth.middleware';

export const sectorRouter = Router();

const CreateSectorSchema = z.object({
  name: z.string().min(1, 'Nome do setor é obrigatório'),
});

const UpdateSectorSchema = z.object({
  name: z.string().min(1, 'Nome do setor é obrigatório'),
});

// GET /api/sectors - Lista todos os setores
sectorRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const sectors = await prisma.sector.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: sectors });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar setores', error: error?.message });
  }
});

// GET /api/sectors/:id - Busca setor por ID
sectorRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const sector = await prisma.sector.findUnique({
      where: { id: req.params.id },
    });
    if (!sector) {
      return res.status(404).json({ success: false, message: 'Setor não encontrado' });
    }
    return res.json({ success: true, data: sector });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar setor', error: error?.message });
  }
});

// POST /api/sectors - Cria novo setor
sectorRouter.post('/', requireRole([Role.SUPERADMIN, Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { name } = CreateSectorSchema.parse(req.body);
    const sector = await prisma.sector.create({
      data: { name },
    });
    return res.status(201).json({ success: true, data: sector });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Erro ao criar setor', error: error?.message });
  }
});

// PUT /api/sectors/:id - Atualiza setor existente
sectorRouter.put('/:id', requireRole([Role.SUPERADMIN, Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { name } = UpdateSectorSchema.parse(req.body);
    const sector = await prisma.sector.update({
      where: { id: req.params.id },
      data: { name },
    });
    return res.json({ success: true, data: sector });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Erro ao atualizar setor', error: error?.message });
  }
});

// DELETE /api/sectors/:id - Remove setor
sectorRouter.delete('/:id', requireRole([Role.SUPERADMIN, Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const ticketCount = await (prisma.ticket as any).count({ where: { sectorId: req.params.id } });
    if (ticketCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Este setor está associado a ${ticketCount} chamado(s) e não pode ser excluído.`,
      });
    }
    await prisma.sector.delete({
      where: { id: req.params.id },
    });
    return res.json({ success: true, message: 'Setor removido com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao remover setor', error: error?.message });
  }
});
