import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Use a single shared Prisma instance for the admin router
const prisma = new PrismaClient();
export const adminRouter = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(4, 'Senha deve ter no mínimo 4 caracteres'),
  role: z.nativeEnum(Role).optional().default(Role.TECHNICIAN),
  companyId: z.string().optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  password: z.string().min(4).optional(),
});

// ─── Helper: log audit event (best-effort) ───────────────────────────────────

async function audit(
  action: string,
  actorEmail: string,
  actorRole: string,
  details: string,
  ip?: string,
) {
  try {
    await prisma.auditLog.create({
      data: { action, user: actorEmail, role: actorRole, details, ipAddress: ip },
    });
  } catch {
    // Non-blocking: audit table may still be warming up
  }
}

// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalAssets,
      totalPeripherals,
      totalVisits,
      totalIssues,
      auditLogsCount,
      superadminCount,
      adminCount,
      managerCount,
      technicianCount,
      viewerCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.asset.count(),
      prisma.peripheral.count(),
      prisma.visit.count(),
      prisma.issue.count(),
      prisma.auditLog.count().catch(() => 0),
      prisma.user.count({ where: { role: Role.SUPERADMIN } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { role: Role.MANAGER } }),
      prisma.user.count({ where: { role: Role.TECHNICIAN } }),
      prisma.user.count({ where: { role: Role.VIEWER } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAssets,
        totalPeripherals,
        totalVisits,
        totalIssues,
        auditLogsCount,
        usersByRole: {
          SUPERADMIN: superadminCount,
          ADMIN: adminCount,
          MANAGER: managerCount,
          TECHNICIAN: technicianCount,
          VIEWER: viewerCount,
        },
        systemHealth: 'OPERATIONAL',
        serverUptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        dbConnection: 'HEALTHY',
      },
    });
  } catch (error) {
    console.error('[ADMIN] Dashboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas do dashboard administrativo.' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
adminRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        company: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('[ADMIN] GET /users error:', error);
    res.status(500).json({ error: 'Erro ao buscar lista de usuários.' });
  }
});

// ─── POST /api/admin/users ────────────────────────────────────────────────────
adminRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
      return;
    }

    const { name, email, password, role, companyId: bodyCompanyId } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
      return;
    }

    let targetCompanyId = bodyCompanyId;
    if (!targetCompanyId) {
      const firstCompany = await prisma.company.findFirst();
      if (!firstCompany) {
        res.status(400).json({ error: 'Nenhuma empresa encontrada para vincular o usuário.' });
        return;
      }
      targetCompanyId = firstCompany.id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, companyId: targetCompanyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        company: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    await audit(
      'USER_CREATED',
      req.user?.email ?? 'SYSTEM_ADMIN',
      req.user?.role ?? 'ADMIN',
      `Novo usuário criado: ${newUser.email} com role ${newUser.role}`,
      req.ip,
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.error('[ADMIN] POST /users error:', error);
    res.status(500).json({ error: 'Erro ao criar novo usuário.' });
  }
});

// ─── PUT /api/admin/users/:id ─────────────────────────────────────────────────
adminRouter.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
      return;
    }

    const { name, email, role, password } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (name)     updateData.name = name;
    if (email)    updateData.email = email;
    if (role)     updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        company: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });

    await audit(
      'USER_UPDATED',
      req.user?.email ?? 'SYSTEM_ADMIN',
      req.user?.role ?? 'ADMIN',
      `Usuário ${updatedUser.email} atualizado. Role: ${updatedUser.role}`,
      req.ip,
    );

    res.json(updatedUser);
  } catch (error) {
    console.error('[ADMIN] PUT /users/:id error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (userToDelete.role === Role.SUPERADMIN) {
      const superadminCount = await prisma.user.count({ where: { role: Role.SUPERADMIN } });
      if (superadminCount <= 1) {
        res.status(400).json({ error: 'Não é possível remover o único SUPERADMIN do sistema.' });
        return;
      }
    }

    // Prevent self-deletion
    if (req.user?.userId === id) {
      res.status(400).json({ error: 'Você não pode remover sua própria conta.' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await audit(
      'USER_DELETED',
      req.user?.email ?? 'SYSTEM_ADMIN',
      req.user?.role ?? 'ADMIN',
      `Usuário removido: ${userToDelete.email} (role: ${userToDelete.role})`,
      req.ip,
    );

    res.json({ success: true, message: `Usuário ${userToDelete.email} removido com sucesso.` });
  } catch (error) {
    console.error('[ADMIN] DELETE /users/:id error:', error);
    res.status(500).json({ error: 'Erro ao remover usuário.' });
  }
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const take = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
    res.json(logs);
  } catch (error) {
    console.error('[ADMIN] GET /audit-logs error:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria.' });
  }
});

// ─── POST /api/admin/audit-logs ───────────────────────────────────────────────
adminRouter.post('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { action, details } = req.body as { action?: string; details?: string };
    const log = await prisma.auditLog.create({
      data: {
        action: action || 'MANUAL_AUDIT_LOG',
        user: req.user?.email ?? 'ADMIN',
        role: req.user?.role ?? 'ADMIN',
        details: details || 'Ação registrada via API Backoffice',
        ipAddress: req.ip,
      },
    });
    res.status(201).json(log);
  } catch (error) {
    console.error('[ADMIN] POST /audit-logs error:', error);
    res.status(500).json({ error: 'Erro ao registrar log de auditoria.' });
  }
});

// ─── GET /api/admin/settings ──────────────────────────────────────────────────
adminRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();

    const defaultSettingsMap: Record<string, string> = {
      maintenanceMode: 'false',
      sessionTimeoutMinutes: '60',
      requireMfaForAdmins: 'true',
      icmpPingIntervalSeconds: '30',
      alertEmailNotification: 'noc-alerts@infrafield.io',
      maxLoginAttempts: '5',
      autoAuditLogRetentionDays: '90',
    };

    settings.forEach((s) => {
      defaultSettingsMap[s.key] = s.value;
    });

    res.json({ success: true, settings: defaultSettingsMap });
  } catch (error) {
    console.error('[ADMIN] GET /settings error:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações do sistema.' });
  }
});

// ─── PUT /api/admin/settings ──────────────────────────────────────────────────
adminRouter.put('/settings', async (req: Request, res: Response) => {
  try {
    const newSettings = req.body as Record<string, unknown>;

    const allowedKeys = new Set([
      'maintenanceMode',
      'sessionTimeoutMinutes',
      'requireMfaForAdmins',
      'icmpPingIntervalSeconds',
      'alertEmailNotification',
      'maxLoginAttempts',
      'autoAuditLogRetentionDays',
    ]);

    for (const [key, value] of Object.entries(newSettings)) {
      if (!allowedKeys.has(key)) continue; // reject unknown settings keys
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    await audit(
      'SETTINGS_SAVED',
      req.user?.email ?? 'ADMIN',
      req.user?.role ?? 'ADMIN',
      'Configurações globais do sistema atualizadas no Backoffice',
      req.ip,
    );

    res.json({ success: true, message: 'Configurações do sistema salvas com sucesso!' });
  } catch (error) {
    console.error('[ADMIN] PUT /settings error:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações do sistema.' });
  }
});
