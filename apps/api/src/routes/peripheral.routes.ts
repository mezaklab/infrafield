import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AssetStatus, PeripheralCategory, PeripheralSubcategory, Prisma } from '@prisma/client';
import { emitAssetStatusUpdate } from '../services/websocket.service';

export const peripheralRouter = Router();

const CreatePeripheralSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  code: z.string().min(2, 'Código é obrigatório'),
  assetTag: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  category: z.nativeEnum(PeripheralCategory).default(PeripheralCategory.COMPUTADOR),
  subcategory: z.nativeEnum(PeripheralSubcategory).optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  specifications: z.string().optional().nullable(),
  status: z.nativeEnum(AssetStatus).optional().default(AssetStatus.OPERATIONAL),
  locationId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

const UpdatePeripheralSchema = CreatePeripheralSchema.partial();

// GET /api/peripherals/stats - Statistics breakdown
peripheralRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      total,
      computador,
      desktop,
      notebook,
      impressora,
      scanner,
      monitor,
      operational,
    ] = await Promise.all([
      prisma.peripheral.count(),
      prisma.peripheral.count({ where: { category: PeripheralCategory.COMPUTADOR } }),
      prisma.peripheral.count({ where: { subcategory: PeripheralSubcategory.DESKTOP } }),
      prisma.peripheral.count({ where: { subcategory: PeripheralSubcategory.NOTEBOOK } }),
      prisma.peripheral.count({ where: { category: PeripheralCategory.IMPRESSORA } }),
      prisma.peripheral.count({ where: { category: PeripheralCategory.SCANNER } }),
      prisma.peripheral.count({ where: { category: PeripheralCategory.MONITOR } }),
      prisma.peripheral.count({ where: { status: AssetStatus.OPERATIONAL } }),
    ]);

    return res.json({
      total,
      operational,
      byCategory: {
        COMPUTADOR: computador,
        IMPRESSORA: impressora,
        SCANNER: scanner,
        MONITOR: monitor,
      },
      bySubcategory: {
        DESKTOP: desktop,
        NOTEBOOK: notebook,
      },
    });
  } catch (error: any) {
    console.error('Error fetching peripheral stats:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas de periféricos' });
  }
});

// GET /api/peripherals - List all peripherals with filters
peripheralRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, subcategory, locationId, search } = req.query;

    const where: Prisma.PeripheralWhereInput = {};

    if (status && status !== 'ALL') {
      where.status = status as AssetStatus;
    }

    if (category && category !== 'ALL') {
      where.category = category as PeripheralCategory;
    }

    if (subcategory && subcategory !== 'ALL') {
      where.subcategory = subcategory as PeripheralSubcategory;
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
        { brand: { contains: String(search), mode: 'insensitive' } },
        { model: { contains: String(search), mode: 'insensitive' } },
        { ipAddress: { contains: String(search), mode: 'insensitive' } },
        { specifications: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const items = await prisma.peripheral.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, building: true, room: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(items);
  } catch (error: any) {
    console.error('Error fetching peripherals:', error);
    return res.status(500).json({ error: 'Erro ao buscar ativos de informática e periféricos' });
  }
});

// GET /api/peripherals/:id - Get single peripheral detail
peripheralRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.peripheral.findUnique({
      where: { id },
      include: {
        location: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        company: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Periférico / Ativo de informática não encontrado' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar item' });
  }
});

// POST /api/peripherals - Create new peripheral item
peripheralRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreatePeripheralSchema.safeParse(req.body);
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

    const existing = await prisma.peripheral.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return res.status(400).json({ error: 'Já existe um item com este código de identificação' });
    }

    // Clear subcategory if category is not COMPUTADOR
    const subcategory = parsed.data.category === PeripheralCategory.COMPUTADOR ? parsed.data.subcategory : null;

    const newPeripheral = await prisma.peripheral.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        assetTag: parsed.data.assetTag,
        serialNumber: parsed.data.serialNumber,
        category: parsed.data.category,
        subcategory,
        brand: parsed.data.brand,
        model: parsed.data.model,
        ipAddress: parsed.data.ipAddress,
        specifications: parsed.data.specifications,
        status: parsed.data.status,
        locationId: parsed.data.locationId,
        companyId,
        assignedToId: parsed.data.assignedToId,
        imageUrl: parsed.data.imageUrl,
      },
      include: {
        location: { select: { id: true, name: true, building: true, room: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json(newPeripheral);
  } catch (error: any) {
    console.error('Error creating peripheral:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar periférico' });
  }
});

// PATCH /api/peripherals/:id - Update peripheral item
peripheralRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdatePeripheralSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const updateData: Prisma.PeripheralUpdateInput = { ...parsed.data };
    if (updateData.category && updateData.category !== PeripheralCategory.COMPUTADOR) {
      updateData.subcategory = null;
    }

    const updated = await prisma.peripheral.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true, building: true, room: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (parsed.data.status || parsed.data.ipAddress) {
      emitAssetStatusUpdate({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        ipAddress: updated.ipAddress || undefined,
      });
    }

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating peripheral:', error);
    return res.status(500).json({ error: 'Erro ao atualizar periférico' });
  }
});

// DELETE /api/peripherals/:id - Delete peripheral item
peripheralRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.peripheral.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir periférico' });
  }
});
