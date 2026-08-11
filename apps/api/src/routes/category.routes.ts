import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireRole } from '../middlewares/auth.middleware';

export const categoryRouter = Router();

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
});

// GET /api/categories - Lista todas as categorias
categoryRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
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
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
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
    const category = await prisma.category.create({
      data: { name },
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
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name },
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
    await prisma.category.delete({
      where: { id: req.params.id },
    });
    return res.json({ success: true, message: 'Categoria removida com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao remover categoria', error: error?.message });
  }
});
