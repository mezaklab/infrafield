import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { DEFAULT_ACCESS_ROLES, PERMISSIONS, TECHNICIAN_PERMISSION_KEYS } from '../config/rbac';

export async function ensureRbacBootstrap(): Promise<void> {
  const permissionIds = new Map<string, string>();
  for (const [key, name, category] of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key }, update: { name, category }, create: { key, name, category },
    });
    permissionIds.set(key, permission.id);
  }

  for (const definition of DEFAULT_ACCESS_ROLES) {
    const role = await prisma.accessRole.upsert({
      where: { key: definition.key },
      update: { name: definition.name, description: definition.description, protected: definition.protected, legacyRole: definition.legacyRole },
      create: definition,
    });
    const existingCount = await prisma.rolePermission.count({ where: { roleId: role.id } });
    if (existingCount === 0) {
      const keys = definition.legacyRole === Role.SUPERADMIN
        ? PERMISSIONS.map(([key]) => key)
        : definition.legacyRole === Role.TECHNICIAN
          ? TECHNICIAN_PERMISSION_KEYS
          : definition.legacyRole === Role.ADMIN
            ? PERMISSIONS.map(([key]) => key).filter((key) => key !== 'roles.manage')
            : ['dashboard.view', 'devices.view', 'monitoring.view', 'alerts.view', 'workorders.view'];
      await prisma.rolePermission.createMany({
        data: keys.map((key) => ({ roleId: role.id, permissionId: permissionIds.get(key)! })),
        skipDuplicates: true,
      });
    }
    await prisma.user.updateMany({
      where: { role: definition.legacyRole, accessRoleId: null },
      data: { accessRoleId: role.id },
    });
  }

  // SUPERADMIN is protected and always retains every registered permission.
  const superRole = await prisma.accessRole.findUniqueOrThrow({ where: { key: 'SUPERADMIN' } });
  await prisma.rolePermission.createMany({
    data: [...permissionIds.values()].map((permissionId) => ({ roleId: superRole.id, permissionId })),
    skipDuplicates: true,
  });
}

export async function ensureBootstrapSuperAdmin(): Promise<{ created: boolean; username: string }> {
  await ensureRbacBootstrap();
  const username = process.env.BOOTSTRAP_SUPERADMIN_USERNAME?.trim().toLowerCase();
  if (!username) throw new Error('BOOTSTRAP_SUPERADMIN_USERNAME deve estar configurado.');
  const existing = await prisma.user.findUnique({ where: { username } });
  const superRole = await prisma.accessRole.findUniqueOrThrow({ where: { key: 'SUPERADMIN' } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: Role.SUPERADMIN, accessRoleId: superRole.id, isActive: true } });
    return { created: false, username };
  }

  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
  if (!password || password.length < 8) throw new Error('BOOTSTRAP_SUPERADMIN_PASSWORD deve ter pelo menos 8 caracteres para criar o usuário inicial.');
  let company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!company) company = await prisma.company.create({ data: { name: process.env.BOOTSTRAP_COMPANY_NAME?.trim() || 'InfraField' } });
  await prisma.user.create({
    data: {
      name: process.env.BOOTSTRAP_SUPERADMIN_NAME?.trim() || 'Super Administrador',
      username,
      email: process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase() || `${username}@infrafield.local`,
      password: await bcrypt.hash(password, 12),
      role: Role.SUPERADMIN,
      accessRoleId: superRole.id,
      isActive: true,
      companyId: company.id,
    },
  });
  return { created: true, username };
}
