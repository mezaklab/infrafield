import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ChecklistFieldType } from '@prisma/client';

export const checklistRouter = Router();

const CreateItemSchema = z.object({
  label: z.string().min(2, 'Descrição do item é obrigatória'),
  fieldType: z.nativeEnum(ChecklistFieldType).optional().default(ChecklistFieldType.YES_NO),
  isRequired: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
  order: z.number().optional().default(0),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(3, 'Nome do modelo é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional().default('Infraestrutura & TI'),
  items: z.array(CreateItemSchema),
});

const SaveResponsesSchema = z.object({
  responses: z.array(
    z.object({
      checklistItemId: z.string(),
      assetId: z.string().optional(),
      value: z.string(),
      notes: z.string().optional(),
    })
  ),
});

// GET /api/checklists/templates - List all active templates with items
checklistRouter.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.checklistTemplate.findMany({
      where: { isActive: true },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar modelos de checklist' });
  }
});

// POST /api/checklists/templates - Create new template
checklistRouter.post('/templates', async (req: Request, res: Response) => {
  try {
    const parsed = CreateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const newTemplate = await prisma.checklistTemplate.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        items: {
          create: parsed.data.items.map((item) => ({
            label: item.label,
            fieldType: item.fieldType,
            isRequired: item.isRequired,
            options: item.options ? JSON.stringify(item.options) : null,
            order: item.order,
          })),
        },
      },
      include: { items: true },
    });

    return res.status(201).json(newTemplate);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar modelo de checklist' });
  }
});

// GET /api/visits/:id/checklists - Get checklist responses for a visit
checklistRouter.get('/visits/:id/checklists', async (req: Request, res: Response) => {
  try {
    const { id: visitId } = req.params;

    const responses = await prisma.checklistResponse.findMany({
      where: { visitId },
      include: {
        checklistItem: true,
        asset: { select: { id: true, code: true, name: true } },
      },
    });

    return res.json(responses);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar respostas do checklist da visita' });
  }
});

// POST /api/visits/:id/checklists - Save or update checklist responses for a visit
checklistRouter.post('/visits/:id/checklists', async (req: Request, res: Response) => {
  try {
    const { id: visitId } = req.params;
    const parsed = SaveResponsesSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Respostas inválidas', details: parsed.error.format() });
    }

    const { responses } = parsed.data;
    const savedResponses = [];

    for (const item of responses) {
      const existing = await prisma.checklistResponse.findFirst({
        where: { visitId, checklistItemId: item.checklistItemId, assetId: item.assetId || null },
      });

      if (existing) {
        const updated = await prisma.checklistResponse.update({
          where: { id: existing.id },
          data: {
            value: item.value,
            notes: item.notes,
          },
        });
        savedResponses.push(updated);
      } else {
        const created = await prisma.checklistResponse.create({
          data: {
            visitId,
            checklistItemId: item.checklistItemId,
            assetId: item.assetId,
            value: item.value,
            notes: item.notes,
          },
        });
        savedResponses.push(created);
      }
    }

    return res.status(200).json({ success: true, count: savedResponses.length, responses: savedResponses });
  } catch (error: any) {
    console.error('Error saving checklist responses:', error);
    return res.status(500).json({ error: 'Erro ao salvar respostas do checklist' });
  }
});
