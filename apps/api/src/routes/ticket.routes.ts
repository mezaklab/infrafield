import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TicketStatus, TicketPriority, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getIO } from '../services/websocket.service';
import { sendTicketNotification } from '../services/whatsapp.service';
import { ticketCreationRateLimiter } from '../middlewares/rateLimit.middleware';
import { requireRole } from '../middlewares/auth.middleware';
import crypto from 'crypto';


export const ticketRouter = Router();

// Validation Schemas
const CreateTicketSchema = z.object({
  subject: z.string().trim().min(3, 'Assunto é obrigatório').max(160),
  description: z.string().trim().min(5, 'Descrição detalhada é obrigatória').max(5000),
  category: z.string().trim().max(100).optional().default('Outros'),
  locationId: z.string().uuid('Localização inválida'),
  assetId: z.string().uuid('Ativo inválido').optional().nullable(),
  priority: z.nativeEnum(TicketPriority).optional().default(TicketPriority.MEDIA),
  attachments: z.array(z.string().max(500)).max(10).optional(),
});

const UpdateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
});

const CreateMessageSchema = z.object({
  content: z.string().trim().max(5000).optional().default(''),
  attachments: z.array(z.string().max(500)).max(10).optional(),
});

// Helper for broadcasting WebSocket events
function broadcastTicketEvent(
  event: string,
  payload: unknown,
  access: { companyId: string; authorId: string },
) {
  const io = getIO();
  if (io) {
    io.to(`staff:${access.companyId}`).to(`user:${access.authorId}`).emit(event, payload);
  }
}

// ─── GET /api/tickets/technicians ─────────────────────────────────────────────
ticketRouter.get('/technicians', async (req: Request, res: Response) => {
  try {
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: [Role.TECHNICIAN, Role.MANAGER, Role.ADMIN, Role.SUPERADMIN] },
        ...(req.user!.role === Role.SUPERADMIN ? {} : { companyId: req.user!.companyId }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json(technicians);
  } catch (error) {
    console.error('[TICKETS] GET /technicians error:', error);
    return res.status(500).json({ error: 'Erro ao carregar lista de técnicos.' });
  }
});

// ─── GET /api/tickets/dashboard ───────────────────────────────────────────────
ticketRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    const baseWhere: any = {};
    if (userRole !== Role.SUPERADMIN) {
      baseWhere.companyId = req.user!.companyId;
    }
    if (userRole === Role.USUARIO) {
      baseWhere.authorId = userId;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Fetch counts in parallel
    const [
      totalActive,
      criticalOverdue,
      resolvedMonth,
      allTickets,
      resolvedTicketsList,
    ] = await Promise.all([
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: { in: [TicketStatus.ABERTO, TicketStatus.EM_ATENDIMENTO, TicketStatus.AGUARDANDO_USUARIO] },
        },
      }),
      prisma.ticket.count({
        where: {
          ...baseWhere,
          OR: [
            { priority: TicketPriority.CRITICA },
            {
              status: { in: [TicketStatus.ABERTO, TicketStatus.EM_ATENDIMENTO] },
              createdAt: { lt: twentyFourHoursAgo },
            },
          ],
        },
      }),
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: TicketStatus.RESOLVIDO,
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.ticket.findMany({
        where: baseWhere,
        include: { location: { select: { name: true } } },
      }),
      prisma.ticket.findMany({
        where: {
          ...baseWhere,
          status: TicketStatus.RESOLVIDO,
        },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    // 2. Average resolution time calculation
    let avgResolutionMinutes = 0;
    if (resolvedTicketsList.length > 0) {
      const totalDiffMs = resolvedTicketsList.reduce((acc, t) => {
        const diffMs = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
        return acc + (diffMs > 0 ? diffMs : 0);
      }, 0);
      avgResolutionMinutes = Math.round(totalDiffMs / (resolvedTicketsList.length * 60 * 1000));
    }

    const hours = Math.floor(avgResolutionMinutes / 60);
    const mins = avgResolutionMinutes % 60;
    const avgResolutionTimeFormatted = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

    // 3. Evolution Chart Data (Last 6 Months)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const evolutionMap: { [key: string]: { month: string; abertos: number; solucionados: number } } = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`;
      evolutionMap[key] = { month: label, abertos: 0, solucionados: 0 };
    }

    allTickets.forEach((t) => {
      const createdDate = new Date(t.createdAt);
      const createdKey = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
      if (evolutionMap[createdKey]) {
        evolutionMap[createdKey].abertos += 1;
      }

      if (t.status === TicketStatus.RESOLVIDO) {
        const updatedDate = new Date(t.updatedAt);
        const updatedKey = `${updatedDate.getFullYear()}-${updatedDate.getMonth()}`;
        if (evolutionMap[updatedKey]) {
          evolutionMap[updatedKey].solucionados += 1;
        }
      }
    });

    const evolution = Object.values(evolutionMap);

    // 4. Sector / Location Distribution (Donut chart data)
    const locationCounts: { [key: string]: number } = {};
    allTickets.forEach((t) => {
      const locName = t.location?.name || 'Geral / TI Central';
      locationCounts[locName] = (locationCounts[locName] || 0) + 1;
    });

    const colors = ['#00f2fe', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
    const sectorDistribution = Object.entries(locationCounts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));

    // 5. Top 5 Equipment / Incident Types (Horizontal bar chart data)
    const categoryKeywords = [
      { category: 'Impressoras & Scanners', keywords: ['impressora', 'toner', 'papel', 'scanner', 'imprimir'] },
      { category: 'Desktops & Notebooks', keywords: ['pc', 'desktop', 'notebook', 'computador', 'windows', 'lento'] },
      { category: 'Rede, Wi-Fi & Switches', keywords: ['rede', 'wifi', 'wi-fi', 'internet', 'switch', 'sem conexao', 'ping'] },
      { category: 'Servidores & Racks', keywords: ['servidor', 'datacenter', 'rack', 'virtual', 'backup'] },
      { category: 'Sistemas & Software', keywords: ['sistema', 'senha', 'email', 'e-mail', 'login', 'acesso'] },
    ];

    const categoryCounts: { [key: string]: number } = {};
    categoryKeywords.forEach((cat) => {
      categoryCounts[cat.category] = 0;
    });
    categoryCounts['Outros / Gerais'] = 0;

    allTickets.forEach((t) => {
      const text = `${t.subject} ${t.description}`.toLowerCase();
      let matched = false;
      for (const cat of categoryKeywords) {
        if (cat.keywords.some((kw) => text.includes(kw))) {
          categoryCounts[cat.category] += 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        categoryCounts['Outros / Gerais'] += 1;
      }
    });

    const topIncidents = Object.entries(categoryCounts)
      .map(([equipment, count]) => ({
        equipment,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({
      kpis: {
        totalActive,
        overdueSla: criticalOverdue,
        resolvedMonth,
        avgResolutionTime: avgResolutionTimeFormatted || '1h 45min',
      },
      charts: {
        evolution,
        sectorDistribution: sectorDistribution.length > 0 ? sectorDistribution : [
          { name: 'Datacenter Central', value: 4, color: '#00f2fe' },
          { name: 'Almoxarifado', value: 3, color: '#3b82f6' },
          { name: 'Suporte TI', value: 2, color: '#10b981' },
        ],
        topIncidents,
      },
    });
  } catch (error) {
    console.error('[TICKETS] GET /dashboard error:', error);
    return res.status(500).json({ error: 'Erro ao gerar dados do dashboard de chamados.' });
  }
});
ticketRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, locationId, priority, assignedToId, search } = req.query;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    const where: any = {};
    if (userRole !== Role.SUPERADMIN) {
      where.companyId = req.user!.companyId;
    }

    // Final users can only see their own created tickets
    if (userRole === Role.USUARIO) {
      where.authorId = userId;
    }

    if (status && status !== 'ALL') {
      where.status = status as TicketStatus;
    }
    if (locationId && locationId !== 'ALL') {
      where.locationId = locationId as string;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority as TicketPriority;
    }
    if (assignedToId && assignedToId !== 'ALL') {
      if (assignedToId === 'UNASSIGNED') {
        where.assignedToId = null;
      } else {
        where.assignedToId = assignedToId as string;
      }
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { author: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
        asset: { select: { id: true, name: true, code: true, category: true, assetTag: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json(tickets);
  } catch (error) {
    console.error('[TICKETS] GET / error:', error);
    return res.status(500).json({ error: 'Erro ao buscar chamados.' });
  }
});

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
ticketRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
        asset: { select: { id: true, name: true, code: true, category: true, assetTag: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }

    if (userRole !== Role.SUPERADMIN && ticket.companyId !== req.user!.companyId) {
      return res.status(403).json({ error: 'Acesso negado a este chamado.' });
    }

    // Permission check
    if (userRole === Role.USUARIO && ticket.authorId !== userId) {
      return res.status(403).json({ error: 'Acesso negado a este chamado.' });
    }

    return res.json(ticket);
  } catch (error) {
    console.error('[TICKETS] GET /:id error:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do chamado.' });
  }
});

// ─── POST /api/tickets ────────────────────────────────────────────────────────
ticketRouter.post('/', ticketCreationRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = CreateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const { subject, description, category: bodyCategory, locationId: bodyLocationId, assetId, priority, attachments } = parsed.data;
    const authorId = req.user!.userId;

    // Resolve locationId: body parameter or user's assigned location
    let targetLocationId: string | null = bodyLocationId;
    if (!targetLocationId) {
      const user = await prisma.user.findUnique({
        where: { id: authorId },
        select: { locationId: true },
      });
      targetLocationId = user?.locationId || null;
    }

    const companyId = req.user!.companyId;
    const location = await prisma.location.findFirst({ where: { id: targetLocationId!, companyId } });
    if (!location) {
      return res.status(400).json({ error: 'Localização inválida para a empresa do usuário.' });
    }
    if (assetId) {
      const asset = await prisma.asset.findFirst({ where: { id: assetId, companyId } });
      if (!asset) return res.status(400).json({ error: 'Ativo inválido para a empresa do usuário.' });
    }

    const code = `TK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Create ticket & initial message inside a transaction
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          code,
          subject,
          description,
          status: TicketStatus.ABERTO,
          priority,
          companyId,
          locationId: targetLocationId,
          assetId: assetId || null,
          authorId,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: authorId,
          content: description,
          attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
        },
      });

      return ticket;
    });

    // Fetch complete newly created ticket with relations
    const createdTicket = await prisma.ticket.findUnique({
      where: { id: newTicket.id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
        asset: { select: { id: true, name: true, code: true, category: true, assetTag: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    broadcastTicketEvent('ticketCreated', createdTicket, {
      companyId: createdTicket!.companyId,
      authorId: createdTicket!.authorId,
    });

    // Envia notificação para o grupo do WhatsApp usando o serviço dedicado
    if (createdTicket) {
      sendTicketNotification({
        code: createdTicket.code,
        subject: createdTicket.subject,
        description: createdTicket.description,
        priority: createdTicket.priority,
        category: bodyCategory,
        author: createdTicket.author,
        location: createdTicket.location,
        asset: createdTicket.asset,
      }).catch((err) => {
        console.error('[TICKETS] Falha ao disparar notificação do WhatsApp:', err?.message);
      });
    }

    return res.status(201).json(createdTicket);
  } catch (error) {
    console.error('[TICKETS] POST / error:', error);
    return res.status(500).json({ error: 'Erro ao abrir novo chamado.' });
  }
});

// ─── PATCH /api/tickets/:id ───────────────────────────────────────────────────
ticketRouter.patch('/:id', requireRole([Role.SUPERADMIN, Role.ADMIN, Role.MANAGER, Role.TECHNICIAN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const { status, priority, assignedToId } = parsed.data;
    const updateData: any = {};

    const existingTicket = await prisma.ticket.findUnique({ where: { id } });
    if (!existingTicket) return res.status(404).json({ error: 'Chamado não encontrado.' });
    if (req.user!.role !== Role.SUPERADMIN && existingTicket.companyId !== req.user!.companyId) {
      return res.status(403).json({ error: 'Acesso negado a este chamado.' });
    }
    if (assignedToId) {
      const assignee = await prisma.user.findFirst({ where: { id: assignedToId, companyId: existingTicket.companyId } });
      if (!assignee) return res.status(400).json({ error: 'Técnico inválido para este chamado.' });
    }

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    broadcastTicketEvent('ticketUpdated', updatedTicket, {
      companyId: updatedTicket.companyId,
      authorId: updatedTicket.authorId,
    });

    return res.json(updatedTicket);
  } catch (error) {
    console.error('[TICKETS] PATCH /:id error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar chamado.' });
  }
});

// ─── POST /api/tickets/:id/messages ──────────────────────────────────────────
ticketRouter.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = CreateMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const { content, attachments } = parsed.data;
    const senderId = req.user!.userId;
    const senderRole = req.user!.role;

    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Insira o texto da mensagem ou envie um anexo.' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }

    if (senderRole !== Role.SUPERADMIN && ticket.companyId !== req.user!.companyId) {
      return res.status(403).json({ error: 'Acesso negado a este chamado.' });
    }

    // Permission check for USUARIO
    if (senderRole === Role.USUARIO && ticket.authorId !== senderId) {
      return res.status(403).json({ error: 'Acesso negado a este chamado.' });
    }

    // Create message & update ticket timestamp / status
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderId,
          content: content.trim(),
          attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
        },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // Auto-advance status if technician/admin responds to open ticket
      let nextStatus = ticket.status;
      if (
        senderRole !== Role.USUARIO &&
        ticket.status === TicketStatus.ABERTO
      ) {
        nextStatus = TicketStatus.EM_ATENDIMENTO;
      }

      await tx.ticket.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          status: nextStatus,
        },
      });

      return msg;
    });

    broadcastTicketEvent('ticketMessageAdded', { ticketId: id, message }, {
      companyId: ticket.companyId,
      authorId: ticket.authorId,
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error('[TICKETS] POST /:id/messages error:', error);
    return res.status(500).json({ error: 'Erro ao enviar mensagem no chamado.' });
  }
});
