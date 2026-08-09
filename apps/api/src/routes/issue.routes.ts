import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { IssueSeverity, IssueStatus, Prisma } from '@prisma/client';

export const issueRouter = Router();

const CreateIssueSchema = z.object({
  title: z.string().min(3, 'Título é obrigatório'),
  description: z.string().min(5, 'Descrição detalhada é obrigatória'),
  severity: z.nativeEnum(IssueSeverity).optional().default(IssueSeverity.MEDIUM),
  status: z.nativeEnum(IssueStatus).optional().default(IssueStatus.OPEN),
  recommendation: z.string().optional(),
  companyId: z.string().optional(),
  visitId: z.string().optional(),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
});

const UpdateIssueSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  recommendation: z.string().optional(),
});

// GET /api/issues - List issues
issueRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, severity, visitId, assetId, search } = req.query;

    const where: Prisma.IssueWhereInput = {};

    if (status && status !== 'ALL') {
      where.status = status as IssueStatus;
    }

    if (severity && severity !== 'ALL') {
      where.severity = severity as IssueSeverity;
    }

    if (visitId) {
      where.visitId = String(visitId);
    }

    if (assetId) {
      where.assetId = String(assetId);
    }

    if (search) {
      where.OR = [
        { protocol: { contains: String(search), mode: 'insensitive' } },
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, building: true } },
        asset: { select: { id: true, code: true, name: true, assetTag: true } },
        visit: { select: { id: true, protocol: true, client: true } },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(issues);
  } catch (error: any) {
    console.error('Error listing issues:', error);
    return res.status(500).json({ error: 'Erro ao buscar problemas/não conformidades' });
  }
});

// POST /api/issues - Create issue
issueRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateIssueSchema.safeParse(req.body);
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

    const count = await prisma.issue.count();
    const protocolNumber = String(count + 100).padStart(3, '0');
    const protocol = `INC-2026-${protocolNumber}`;

    const newIssue = await prisma.issue.create({
      data: {
        protocol,
        title: parsed.data.title,
        description: parsed.data.description,
        severity: parsed.data.severity,
        status: parsed.data.status,
        recommendation: parsed.data.recommendation,
        companyId,
        visitId: parsed.data.visitId,
        assetId: parsed.data.assetId,
        locationId: parsed.data.locationId,
      },
      include: {
        location: { select: { id: true, name: true } },
        asset: { select: { id: true, code: true, name: true } },
        visit: { select: { id: true, protocol: true } },
      },
    });

    return res.status(201).json(newIssue);
  } catch (error: any) {
    console.error('Error creating issue:', error);
    return res.status(500).json({ error: 'Erro ao registrar não conformidade' });
  }
});

// PATCH /api/issues/:id - Update status / severity
issueRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdateIssueSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: parsed.data,
      include: {
        location: { select: { id: true, name: true } },
        asset: { select: { id: true, code: true, name: true } },
        visit: { select: { id: true, protocol: true } },
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar problema/não conformidade' });
  }
});
