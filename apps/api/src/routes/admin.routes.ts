import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requirePermission } from '../middlewares/auth.middleware';
import { passwordSchema } from '../utils/passwordPolicy';

export const adminRouter = Router();

// ─── Helper functions for username ──────────────────────────────────────────
function sanitizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]/g, '');
}

function generateDefaultUsername(name: string, email?: string): string {
  if (name) {
    const parts = name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s.]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]}.${parts[parts.length - 1]}`;
    } else if (parts.length === 1) {
      return parts[0];
    }
  }
  if (email) {
    return sanitizeUsername(email.split('@')[0]);
  }
  return 'usuario';
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').max(120),
  username: z.string().trim().max(80).optional(),
  email: z.string().trim().email('E-mail inválido').max(254),
  password: passwordSchema,
  role: z.nativeEnum(Role).optional().default(Role.TECHNICIAN),
  companyId: z.string().optional(),
  locationId: z.string().optional().nullable(),
  accessRoleId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const UpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  username: z.string().trim().max(80).optional(),
  email: z.string().trim().email('E-mail inválido').max(254).optional(),
  role: z.nativeEnum(Role).optional(),
  password: z.union([passwordSchema, z.literal('')]).optional().transform((value) => value || undefined),
  locationId: z.preprocess((value) => value === '' ? undefined : value, z.string().uuid('Localização inválida').optional().nullable()),
  accessRoleId: z.preprocess((value) => value === '' ? undefined : value, z.string().uuid('Cargo inválido').optional().nullable()),
  isActive: z.boolean().optional(),
});

function logUserUpdateValidation(issues: z.ZodIssue[]): void {
  console.warn('[USER_UPDATE_VALIDATION]', issues.map((issue) => ({
    field: issue.path.join('.') || 'payload',
    reason: issue.message,
  })));
}

const RoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  enabled: z.boolean().optional().default(true),
  permissionKeys: z.array(z.string().min(2).max(100)).default([]),
});

function roleKey(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

adminRouter.get('/permissions', requirePermission('roles.view'), async (_req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(permissions);
});

adminRouter.get('/roles', requirePermission('roles.view'), async (_req, res) => {
  const roles = await prisma.accessRole.findMany({
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(roles.map((role) => ({ ...role, permissionKeys: role.permissions.map((item) => item.permission.key) })));
});

adminRouter.post('/roles', requirePermission('roles.manage'), async (req, res) => {
  const parsed = RoleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() }); return; }
  const key = roleKey(parsed.data.name);
  if (!key) { res.status(400).json({ error: 'Nome de cargo inválido.' }); return; }
  const permissions = await prisma.permission.findMany({ where: { key: { in: parsed.data.permissionKeys } } });
  if (permissions.length !== new Set(parsed.data.permissionKeys).size) { res.status(400).json({ error: 'Uma ou mais permissões são inválidas.' }); return; }
  try {
    const role = await prisma.accessRole.create({
      data: {
        key, name: parsed.data.name, description: parsed.data.description, enabled: parsed.data.enabled,
        permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
      },
    });
    res.status(201).json(role);
  } catch (error: any) {
    res.status(error?.code === 'P2002' ? 409 : 500).json({ error: error?.code === 'P2002' ? 'Já existe um cargo com este nome.' : 'Erro ao criar cargo.' });
  }
});

adminRouter.put('/roles/:id', requirePermission('roles.manage'), async (req, res) => {
  const parsed = RoleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() }); return; }
  const existing = await prisma.accessRole.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Cargo não encontrado.' }); return; }
  if (existing.key === 'SUPERADMIN') { res.status(400).json({ error: 'O cargo SUPERADMIN é protegido e mantém acesso completo.' }); return; }
  const permissions = await prisma.permission.findMany({ where: { key: { in: parsed.data.permissionKeys } } });
  if (permissions.length !== new Set(parsed.data.permissionKeys).size) { res.status(400).json({ error: 'Uma ou mais permissões são inválidas.' }); return; }
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: existing.id } }),
    prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: existing.id, permissionId: permission.id })) }),
    prisma.accessRole.update({ where: { id: existing.id }, data: { name: parsed.data.name, description: parsed.data.description, enabled: parsed.data.enabled } }),
  ]);
  res.json({ success: true });
});

adminRouter.delete('/roles/:id', requirePermission('roles.manage'), async (req, res) => {
  const role = await prisma.accessRole.findUnique({ where: { id: req.params.id }, include: { _count: { select: { users: true } } } });
  if (!role) { res.status(404).json({ error: 'Cargo não encontrado.' }); return; }
  if (role.protected) { res.status(400).json({ error: 'Cargos padrão protegidos não podem ser excluídos.' }); return; }
  if (role._count.users > 0) { res.status(409).json({ error: 'Reassocie os usuários antes de excluir este cargo.' }); return; }
  await prisma.accessRole.delete({ where: { id: role.id } });
  res.status(204).send();
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
      companyCount,
      locationCount,
      userCount,
      technicianCount,
      activeVisitsCount,
      openTicketsCount,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.location.count(),
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.TECHNICIAN } }),
      prisma.visit.count({ where: { status: 'EM_ANDAMENTO' } }),
      prisma.ticket.count({ where: { status: { in: ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_USUARIO'] } } }),
    ]);

    const auditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      companyCount,
      locationCount,
      userCount,
      technicianCount,
      activeVisitsCount,
      openTicketsCount,
      byRole: {
        SUPERADMIN: await prisma.user.count({ where: { role: Role.SUPERADMIN } }),
        ADMIN: await prisma.user.count({ where: { role: Role.ADMIN } }),
        MANAGER: await prisma.user.count({ where: { role: Role.MANAGER } }),
        TECHNICIAN: technicianCount,
        USUARIO: await prisma.user.count({ where: { role: Role.USUARIO } }),
        VIEWER: await prisma.user.count({ where: { role: Role.VIEWER } }),
      },
      auditLogs,
    });
  } catch (error) {
    console.error('[ADMIN] GET /dashboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard.' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
adminRouter.get('/users', requirePermission('users.view'), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        accessRoleId: true,
        accessRole: { select: { id: true, key: true, name: true } },
        companyId: true,
        company: { select: { id: true, name: true } },
        locationId: true,
        location: { select: { id: true, name: true, building: true, room: true } },
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
adminRouter.post('/users', requirePermission('users.manage'), async (req: Request, res: Response) => {
  try {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
      return;
    }

    const { name, username, email: rawEmail, password, companyId: bodyCompanyId, locationId, accessRoleId, isActive } = parsed.data;
    const email = rawEmail.toLowerCase();
    const selectedAccessRole = accessRoleId ? await prisma.accessRole.findUnique({ where: { id: accessRoleId } }) : null;
    if (accessRoleId && (!selectedAccessRole || !selectedAccessRole.enabled)) { res.status(400).json({ error: 'Cargo inválido ou inativo.' }); return; }
    const role = selectedAccessRole?.legacyRole || parsed.data.role;
    if (role === Role.SUPERADMIN && req.user?.role !== Role.SUPERADMIN) { res.status(403).json({ error: 'Somente SUPERADMIN pode atribuir este cargo.' }); return; }

    const existingUser = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existingUser) {
      res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
      return;
    }

    const finalUsername = username ? sanitizeUsername(username) : generateDefaultUsername(name, email);
    const existingUsername = await prisma.user.findFirst({ where: { username: finalUsername } });
    if (existingUsername) {
      res.status(400).json({ error: `O nome de usuário "${finalUsername}" já está em uso.` });
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
      data: {
        name,
        email,
        username: finalUsername,
        password: hashedPassword,
        role,
        accessRoleId: selectedAccessRole?.id,
        isActive,
        companyId: targetCompanyId,
        locationId: locationId || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        accessRoleId: true,
        accessRole: { select: { id: true, key: true, name: true } },
        companyId: true,
        company: { select: { id: true, name: true } },
        locationId: true,
        location: { select: { id: true, name: true, building: true, room: true } },
        createdAt: true,
      },
    });

    await audit(
      'USER_CREATED',
      req.user?.email ?? 'SYSTEM_ADMIN',
      req.user?.role ?? 'ADMIN',
      `Novo usuário criado: ${newUser.username} (${newUser.email}) com role ${newUser.role}`,
      req.ip,
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.error('[ADMIN] POST /users error:', error);
    res.status(500).json({ error: 'Erro ao criar novo usuário.' });
  }
});

// ─── PUT /api/admin/users/:id ─────────────────────────────────────────────────
adminRouter.put('/users/:id', requirePermission('users.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      logUserUpdateValidation(parsed.error.issues);
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    const { name, username, email, password, locationId, accessRoleId, isActive } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (name)                    updateData.name = name;
    if (email) {
      const normalizedEmail = email.toLowerCase();
      const existingEmail = await prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: 'insensitive' }, id: { not: id } } });
      if (existingEmail) { res.status(409).json({ error: 'Este e-mail já está cadastrado em outra conta.' }); return; }
      updateData.email = normalizedEmail;
      if (normalizedEmail !== targetUser.email.toLowerCase()) {
        await audit('EMAIL_CHANGED', req.user?.email ?? 'SYSTEM_ADMIN', req.user?.role ?? 'ADMIN', `E-mail do usuário ${targetUser.id} alterado.` , req.ip);
      }
    }
    if (username) {
      const sanitized = sanitizeUsername(username);
      const existing = await prisma.user.findFirst({ where: { username: sanitized, id: { not: id } } });
      if (existing) {
        res.status(400).json({ error: `O nome de usuário "${sanitized}" já está em uso.` });
        return;
      }
      updateData.username = sanitized;
    }
    if (accessRoleId !== undefined) {
      const selectedRole = accessRoleId ? await prisma.accessRole.findUnique({ where: { id: accessRoleId } }) : null;
      if (accessRoleId && (!selectedRole || !selectedRole.enabled)) { res.status(400).json({ error: 'Cargo inválido ou inativo.' }); return; }
      if (selectedRole?.legacyRole === Role.SUPERADMIN && req.user?.role !== Role.SUPERADMIN) { res.status(403).json({ error: 'Somente SUPERADMIN pode atribuir este cargo.' }); return; }
      updateData.accessRoleId = selectedRole?.id || null;
      if (selectedRole?.legacyRole) updateData.role = selectedRole.legacyRole;
    } else if (parsed.data.role) {
      if (parsed.data.role === Role.SUPERADMIN && req.user?.role !== Role.SUPERADMIN) { res.status(403).json({ error: 'Somente SUPERADMIN pode atribuir este perfil.' }); return; }
      updateData.role = parsed.data.role;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    const resultingRole = (updateData.role as Role | undefined) || targetUser.role;
    const resultingActive = (updateData.isActive as boolean | undefined) ?? targetUser.isActive;
    if (targetUser.role === Role.SUPERADMIN && (resultingRole !== Role.SUPERADMIN || !resultingActive)) {
      const activeSuperAdmins = await prisma.user.count({ where: { role: Role.SUPERADMIN, isActive: true } });
      if (activeSuperAdmins <= 1) { res.status(400).json({ error: 'Não é possível remover ou desativar o último SUPERADMIN.' }); return; }
    }
    if (password)                updateData.password = await bcrypt.hash(password, 10);
    if (locationId !== undefined) updateData.locationId = locationId || null;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        accessRoleId: true,
        accessRole: { select: { id: true, key: true, name: true } },
        companyId: true,
        company: { select: { id: true, name: true } },
        locationId: true,
        location: { select: { id: true, name: true, building: true, room: true } },
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
  } catch (error: any) {
    console.error('[ADMIN] PUT /users/:id error:', error);
    res.status(error?.code === 'P2002' ? 409 : 500).json({ error: error?.code === 'P2002' ? 'E-mail ou nome de usuário já cadastrado.' : 'Erro ao atualizar usuário.' });
  }
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
adminRouter.delete('/users/:id', requirePermission('users.manage'), async (req: Request, res: Response) => {
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
