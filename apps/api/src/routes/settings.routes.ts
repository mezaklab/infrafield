import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const settingsRouter = Router();

const UpdateSettingsSchema = z.object({
  whatsapp_group_id: z.string().optional().nullable(),
  whatsapp_group_name: z.string().optional().nullable(),
});

// GET /api/settings - Retorna as configurações atuais (cria registro default se não existir)
settingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          whatsapp_group_id: null,
          whatsapp_group_name: null,
          whatsapp_status: 'DISCONNECTED',
        },
      });
    }
    return res.json({ success: true, data: settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar configurações', error: error?.message });
  }
});

// POST / PUT / PATCH /api/settings - Atualiza ou cria as configurações
const handleUpdateSettings = async (req: Request, res: Response) => {
  try {
    const data = UpdateSettingsSchema.parse(req.body);
    let settings = await prisma.settings.findFirst();

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          whatsapp_group_id: data.whatsapp_group_id ?? null,
          whatsapp_group_name: data.whatsapp_group_name ?? null,
          whatsapp_status: 'DISCONNECTED',
        },
      });
    }

    return res.json({ success: true, data: settings });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Erro ao atualizar configurações', error: error?.message });
  }
};

settingsRouter.post('/', handleUpdateSettings);
settingsRouter.put('/', handleUpdateSettings);
settingsRouter.patch('/', handleUpdateSettings);

