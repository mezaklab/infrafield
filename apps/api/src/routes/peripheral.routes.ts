import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AssetStatus, PeripheralCategory, PeripheralSubcategory, Prisma, Role } from '@prisma/client';
import { emitAssetStatusUpdate } from '../services/websocket.service';
import { normalizeMacAddress } from '../modules/network/utils/macAddress';
import { findMacOwner } from '../modules/network/services/findMacOwner';

export const peripheralRouter = Router();

const PeripheralFieldsSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  code: z.string().min(2, 'Código é obrigatório'),
  assetTag: z.string().optional().nullable(),
  ownershipType: z.string().optional().nullable(),
  rentalCompany: z.string().optional().nullable(),
  rental_company: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  category: z.nativeEnum(PeripheralCategory).default(PeripheralCategory.COMPUTADOR),
  subcategory: z.nativeEnum(PeripheralSubcategory).optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  macAddress: z.string().trim().transform((value, ctx) => {
    if (!value) return null;
    const normalized = normalizeMacAddress(value);
    if (!normalized) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MAC Address inválido' }); return z.NEVER; }
    return normalized;
  }).optional().nullable(),
  monitoringEnabled: z.boolean().optional().default(false),
  specifications: z.string().optional().nullable(),
  status: z.nativeEnum(AssetStatus).optional().default(AssetStatus.OPERATIONAL),
  locationId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});
const CreatePeripheralSchema = PeripheralFieldsSchema.superRefine((data, ctx) => {
  if (data.monitoringEnabled && !data.macAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['macAddress'], message: 'Informe um MAC Address para ativar o monitoramento.' });
});

const UpdatePeripheralSchema = PeripheralFieldsSchema.partial().superRefine((data, ctx) => {
  if (data.monitoringEnabled === true && data.macAddress === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['macAddress'], message: 'Informe um MAC Address para ativar o monitoramento.' });
});

const canAccessCompany = (req: Request, companyId: string) =>
  req.user?.role === Role.SUPERADMIN || req.user?.companyId === companyId;

// GET /api/peripherals/stats - Statistics breakdown
peripheralRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantWhere: Prisma.PeripheralWhereInput = req.user?.role === Role.SUPERADMIN
      ? {}
      : { companyId: req.user!.companyId };
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
      prisma.peripheral.count({ where: tenantWhere }),
      prisma.peripheral.count({ where: { ...tenantWhere, category: PeripheralCategory.COMPUTADOR } }),
      prisma.peripheral.count({ where: { ...tenantWhere, subcategory: PeripheralSubcategory.DESKTOP } }),
      prisma.peripheral.count({ where: { ...tenantWhere, subcategory: PeripheralSubcategory.NOTEBOOK } }),
      prisma.peripheral.count({ where: { ...tenantWhere, category: PeripheralCategory.IMPRESSORA } }),
      prisma.peripheral.count({ where: { ...tenantWhere, category: PeripheralCategory.SCANNER } }),
      prisma.peripheral.count({ where: { ...tenantWhere, category: PeripheralCategory.MONITOR } }),
      prisma.peripheral.count({ where: { ...tenantWhere, status: AssetStatus.OPERATIONAL } }),
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

    const where: Prisma.PeripheralWhereInput = req.user?.role === Role.SUPERADMIN
      ? {}
      : { companyId: req.user!.companyId };

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
        { currentIp: { contains: String(search), mode: 'insensitive' } },
        { macAddress: { contains: String(search), mode: 'insensitive' } },
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

    if (!canAccessCompany(req, item.companyId)) {
      return res.status(403).json({ error: 'Acesso negado' });
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

    let companyId = req.user?.role === Role.SUPERADMIN
      ? parsed.data.companyId
      : req.user!.companyId;
    if (!companyId) {
      const company = await prisma.company.findFirst();
      if (!company) {
        return res.status(400).json({ error: 'Nenhuma empresa cadastrada no sistema' });
      }
      companyId = company.id;
    }

    if (parsed.data.locationId) {
      const location = await prisma.location.findFirst({ where: { id: parsed.data.locationId, companyId }, select: { id: true } });
      if (!location) return res.status(400).json({ error: 'A localização selecionada não existe mais. Selecione outra localização.', code: 'INVALID_LOCATION' });
    }
    if (parsed.data.macAddress) {
      const owner = await findMacOwner(parsed.data.macAddress);
      if (owner) return res.status(409).json({ error: `MAC Address já cadastrado em ${owner.name} (${owner.code}).` });
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
        macAddress: parsed.data.macAddress,
        monitoringEnabled: parsed.data.monitoringEnabled,
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
    if (error?.code === 'P2002') return res.status(409).json({ error: 'MAC Address ou código já cadastrado em outro ativo.' });
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

    const existing = await prisma.peripheral.findUnique({ where: { id }, select: { companyId: true, macAddress: true, monitoringEnabled: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Periférico / Ativo de informática não encontrado' });
    }
    if (!canAccessCompany(req, existing.companyId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (parsed.data.locationId) {
      const location = await prisma.location.findFirst({ where: { id: parsed.data.locationId, companyId: existing.companyId }, select: { id: true } });
      if (!location) return res.status(400).json({ error: 'A localização selecionada não existe mais. Selecione outra localização.', code: 'INVALID_LOCATION' });
    }
    const resultingMac = parsed.data.macAddress === undefined ? existing.macAddress : parsed.data.macAddress;
    const resultingMonitoring = parsed.data.monitoringEnabled === undefined ? existing.monitoringEnabled : parsed.data.monitoringEnabled;
    if (resultingMonitoring && !resultingMac) return res.status(400).json({ error: 'Informe um MAC Address para ativar o monitoramento.' });
    if (parsed.data.macAddress) {
      const owner = await findMacOwner(parsed.data.macAddress, { kind: 'PERIPHERAL', id });
      if (owner) return res.status(409).json({ error: `MAC Address já cadastrado em ${owner.name} (${owner.code}).` });
    }

    const updateData: Prisma.PeripheralUpdateInput = { ...parsed.data };
    if (req.user?.role !== Role.SUPERADMIN) {
      delete updateData.company;
    }
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

    if (parsed.data.status) {
      emitAssetStatusUpdate({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        ipAddress: updated.currentIp || undefined,
        companyId: updated.companyId,
      });
    }

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating peripheral:', error);
    if (error?.code === 'P2002') return res.status(409).json({ error: 'MAC Address já cadastrado em outro ativo.' });
    return res.status(500).json({ error: 'Erro ao atualizar periférico' });
  }
});

// DELETE /api/peripherals/:id - Delete peripheral item
peripheralRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.peripheral.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Periférico / Ativo de informática não encontrado' });
    }
    if (!canAccessCompany(req, existing.companyId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    await prisma.peripheral.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir periférico' });
  }
});
