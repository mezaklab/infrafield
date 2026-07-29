import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { VisitStatus, VisitPriority, VisitType, VisitAssetStatus } from '@prisma/client';

export const visitRouter = Router();

const CreateVisitSchema = z.object({
  client: z.string().min(2, 'Nome do cliente é obrigatório'),
  address: z.string().min(3, 'Endereço é obrigatório'),
  locationId: z.string().optional(),
  priority: z.nativeEnum(VisitPriority).optional().default(VisitPriority.MEDIA),
  type: z.nativeEnum(VisitType).optional().default(VisitType.INSPECAO),
  scheduledDate: z.string().or(z.date()),
  scheduledTime: z.string().optional(),
  notes: z.string().optional(),
  technicianId: z.string().optional(),
  companyId: z.string().optional(),
});

const CheckAssetSchema = z.object({
  status: z.nativeEnum(VisitAssetStatus),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

// GET /api/visits - List visits
visitRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, priority, search } = req.query;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status as VisitStatus;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority as VisitPriority;
    }

    if (search) {
      where.OR = [
        { protocol: { contains: String(search), mode: 'insensitive' } },
        { client: { contains: String(search), mode: 'insensitive' } },
        { address: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, building: true, room: true } },
        technician: { select: { id: true, name: true, email: true } },
        visitAssets: {
          include: {
            asset: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return res.json(visits);
  } catch (error: any) {
    console.error('Error listing visits:', error);
    return res.status(500).json({ error: 'Erro ao buscar visitas' });
  }
});

// GET /api/visits/:id - Get visit details with VisitAssets
visitRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        location: true,
        company: true,
        technician: { select: { id: true, name: true, email: true } },
        visitAssets: {
          include: {
            asset: {
              include: {
                location: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    return res.json(visit);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao obter visita' });
  }
});

// POST /api/visits - Create visit
visitRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    let companyId = parsed.data.companyId;
    if (!companyId) {
      const company = await prisma.company.findFirst();
      if (!company) {
        return res.status(400).json({ error: 'Nenhuma empresa cadastrada' });
      }
      companyId = company.id;
    }

    const count = await prisma.visit.count();
    const protocolNumber = String(count + 100).padStart(3, '0');
    const protocol = `VIS-2026-${protocolNumber}`;

    const newVisit = await prisma.visit.create({
      data: {
        protocol,
        client: parsed.data.client,
        address: parsed.data.address,
        locationId: parsed.data.locationId,
        priority: parsed.data.priority,
        type: parsed.data.type,
        scheduledDate: new Date(parsed.data.scheduledDate),
        scheduledTime: parsed.data.scheduledTime || '09:00 - 12:00',
        notes: parsed.data.notes,
        technicianId: parsed.data.technicianId,
        companyId,
        status: VisitStatus.PLANEJADA,
      },
    });

    if (parsed.data.locationId) {
      const locationAssets = await prisma.asset.findMany({
        where: { locationId: parsed.data.locationId },
      });

      if (locationAssets.length > 0) {
        await prisma.visitAsset.createMany({
          data: locationAssets.map((asset) => ({
            visitId: newVisit.id,
            assetId: asset.id,
            status: VisitAssetStatus.ESPERADO,
          })),
        });
      }
    }

    const fullVisit = await prisma.visit.findUnique({
      where: { id: newVisit.id },
      include: {
        location: true,
        technician: { select: { id: true, name: true } },
        visitAssets: { include: { asset: true } },
      },
    });

    return res.status(201).json(fullVisit);
  } catch (error: any) {
    console.error('Error creating visit:', error);
    return res.status(500).json({ error: 'Erro ao criar visita' });
  }
});

// POST /api/visits/:id/start - Start inspection
visitRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        status: VisitStatus.EM_ANDAMENTO,
        startedAt: new Date(),
      },
      include: {
        location: true,
        technician: { select: { id: true, name: true } },
        visitAssets: { include: { asset: true } },
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao iniciar vistoria' });
  }
});

// POST /api/visits/:id/complete - Complete inspection
visitRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        status: VisitStatus.CONCLUIDA,
        completedAt: new Date(),
      },
      include: {
        location: true,
        technician: { select: { id: true, name: true } },
        visitAssets: { include: { asset: true } },
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao finalizar vistoria' });
  }
});

// POST /api/visits/:id/assets/:assetId/check - Check asset with optional photoUrl
visitRouter.post('/:id/assets/:assetId/check', async (req: Request, res: Response) => {
  try {
    const { id: visitId, assetId } = req.params;
    const parsed = CheckAssetSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Status inválido', details: parsed.error.format() });
    }

    let visitAsset = await prisma.visitAsset.findFirst({
      where: { visitId, assetId },
    });

    if (visitAsset) {
      visitAsset = await prisma.visitAsset.update({
        where: { id: visitAsset.id },
        data: {
          status: parsed.data.status,
          notes: parsed.data.notes,
          photoUrl: parsed.data.photoUrl,
          checkedAt: new Date(),
        },
        include: { asset: true },
      });
    } else {
      visitAsset = await prisma.visitAsset.create({
        data: {
          visitId,
          assetId,
          status: parsed.data.status,
          notes: parsed.data.notes,
          photoUrl: parsed.data.photoUrl,
          checkedAt: new Date(),
        },
        include: { asset: true },
      });
    }

    return res.json(visitAsset);
  } catch (error: any) {
    console.error('Error checking visit asset:', error);
    return res.status(500).json({ error: 'Erro ao registrar status do ativo na visita' });
  }
});

// GET /api/visits/:id/summary - Audit summary
visitRouter.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        visitAssets: {
          include: { asset: true },
        },
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    const totalAssets = visit.visitAssets.length;
    const esperados = visit.visitAssets.filter((va) => va.status === VisitAssetStatus.ESPERADO).length;
    const encontrados = visit.visitAssets.filter((va) => va.status === VisitAssetStatus.ENCONTRADO).length;
    const ausentes = visit.visitAssets.filter((va) => va.status === VisitAssetStatus.AUSENTE).length;
    const novos = visit.visitAssets.filter((va) => va.status === VisitAssetStatus.NOVO).length;

    const totalExpectedInitial = esperados + encontrados + ausentes;
    const conciliationRate = totalExpectedInitial > 0
      ? Math.round((encontrados / totalExpectedInitial) * 100)
      : 100;

    return res.json({
      visitId: visit.id,
      protocol: visit.protocol,
      status: visit.status,
      startedAt: visit.startedAt,
      completedAt: visit.completedAt,
      totals: {
        totalAssets,
        esperados,
        encontrados,
        ausentes,
        novos,
        conciliationRate,
      },
      visitAssets: visit.visitAssets,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar resumo de auditoria da visita' });
  }
});
