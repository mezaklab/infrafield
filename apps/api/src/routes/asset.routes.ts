import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AssetStatus } from '@prisma/client';
import { processAndSaveEquipmentImage } from '../services/imageProcessor.service';
import { emitAssetStatusUpdate } from '../services/websocket.service';

export const assetRouter = Router();

const CreateAssetSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  code: z.string().min(2, 'Código é obrigatório'),
  assetTag: z.string().optional(),
  serialNumber: z.string().optional(),
  hostname: z.string().optional(),
  ipAddress: z.string().optional(),
  category: z.string().min(2, 'Categoria é obrigatória'),
  status: z.nativeEnum(AssetStatus).optional().default(AssetStatus.OPERATIONAL),
  locationId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
  imageUrl: z.string().optional(),
  wifiBands: z.string().optional().nullable(),
});

const UpdateAssetSchema = CreateAssetSchema.partial();

// GET /api/assets - List all assets
assetRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, locationId, search } = req.query;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status as AssetStatus;
    }

    if (category && category !== 'ALL') {
      where.category = category as string;
    }

    if (locationId && locationId !== 'ALL') {
      where.locationId = locationId as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } },
        { assetTag: { contains: String(search), mode: 'insensitive' } },
        { serialNumber: { contains: String(search), mode: 'insensitive' } },
        { hostname: { contains: String(search), mode: 'insensitive' } },
        { ipAddress: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, building: true, room: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(assets);
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    return res.status(500).json({ error: 'Erro ao buscar ativos' });
  }
});

// GET /api/assets/:id - Get asset details
assetRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        location: true,
        company: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }

    return res.json(asset);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar ativo' });
  }
});

// POST /api/assets - Create asset
assetRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateAssetSchema.safeParse(req.body);
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

    const existing = await prisma.asset.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return res.status(400).json({ error: 'Já existe um ativo com este código de identificação' });
    }

    let imageUrl = parsed.data.imageUrl;

    // Process image to remove white background and convert to transparent local PNG if provided as remote URL
    if (imageUrl && !imageUrl.startsWith('/uploads/assets/')) {
      try {
        const processedUrl = await processAndSaveEquipmentImage(imageUrl);
        if (processedUrl) {
          imageUrl = processedUrl;
        }
      } catch (procErr) {
        console.warn('Image background removal on creation failed, preserving original URL:', procErr);
      }
    }

    const newAsset = await prisma.asset.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        assetTag: parsed.data.assetTag,
        serialNumber: parsed.data.serialNumber,
        hostname: parsed.data.hostname,
        ipAddress: parsed.data.ipAddress,
        category: parsed.data.category,
        status: parsed.data.status,
        locationId: parsed.data.locationId,
        companyId,
        assignedToId: parsed.data.assignedToId,
        imageUrl,
        wifiBands: parsed.data.wifiBands,
      },
      include: {
        location: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(newAsset);
  } catch (error: any) {
    console.error('Error creating asset:', error);
    return res.status(500).json({ error: 'Erro ao criar ativo' });
  }
});

// PATCH /api/assets/:id - Update asset
assetRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdateAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const updateData = { ...parsed.data };

    if (updateData.imageUrl && !updateData.imageUrl.startsWith('/uploads/assets/')) {
      try {
        const processedUrl = await processAndSaveEquipmentImage(updateData.imageUrl, id);
        if (processedUrl) {
          updateData.imageUrl = processedUrl;
        }
      } catch (procErr) {
        console.warn('Image background removal on update failed, preserving original URL:', procErr);
      }
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (parsed.data.status) {
      emitAssetStatusUpdate({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        ipAddress: updated.ipAddress,
      });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar ativo' });
  }
});

// DELETE /api/assets/:id - Delete asset
assetRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.asset.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover ativo' });
  }
});
