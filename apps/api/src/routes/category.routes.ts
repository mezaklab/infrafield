import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireRole } from '../middlewares/auth.middleware';

export const categoryRouter = Router();
const categoryStore = prisma.category as any;

const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nome da categoria é obrigatório'),
});

const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nome da categoria é obrigatório'),
});

// GET /api/categories - Lista todas as categorias
categoryRouter.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await categoryStore.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar categorias', error: error?.message });
  }
});

// GET /api/categories/:id - Busca categoria por ID
categoryRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = await categoryStore.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    return res.json({ success: true, data: category });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar categoria', error: error?.message });
  }
});

// POST /api/categories - Cria nova categoria
categoryRouter.post('/', requireRole([Role.SUPERADMIN, Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { name } = CreateCategorySchema.parse(req.body);
    const normalizedName = name.trim();
    const duplicate = await categoryStore.findFirst({
      where: { companyId: req.user!.companyId, name: { equals: normalizedName, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Já existe uma categoria com esse nome.' });
    }
    const category = await categoryStore.create({
      data: { name: normalizedName, companyId: req.user!.companyId },
    });
    return res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Erro ao criar categoria', error: error?.message });
  }
});

// PUT /api/categories/:id - Atualiza categoria existente
categoryRouter.put('/:id', requireRole([Role.SUPERADMIN, Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const { name } = UpdateCategorySchema.parse(req.body);
    const normalizedName = name.trim();
    const duplicate = await categoryStore.findFirst({
      where: {
        companyId: req.user!.companyId,
        name: { equals: normalizedName, mode: 'insensitive' },
        NOT: { id: req.params.id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Já existe uma categoria com esse nome.' });
    }
    const updated = await categoryStore.updateMany({
      where: { id: req.params.id, companyId: req.user!.companyId },
      data: { name: normalizedName },
    });
    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    const category = await categoryStore.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    return res.json({ success: true, data: category });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Erro ao atualizar categoria', error: error?.message });
  }
});

// DELETE /api/categories/:id - Remove categoria
categoryRouter.delete('/:id', requireRole([Role.SUPERADMIN, Role.ADMIN]), async (req: Request, res: Response) => {
  try {
    const category = await categoryStore.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      select: { id: true },
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }
    const linkedTickets = await (prisma.ticket as any).count({ where: { categoryId: req.params.id, companyId: req.user!.companyId } });
    if (linkedTickets > 0) {
      return res.status(409).json({ success: false, message: 'Não é possível excluir uma categoria associada a chamados existentes.' });
    }
    await categoryStore.delete({
      where: { id: category.id },
    });
    return res.json({ success: true, message: 'Categoria removida com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao remover categoria', error: error?.message });
  }
});
