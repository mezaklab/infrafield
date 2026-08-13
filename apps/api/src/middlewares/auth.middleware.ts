import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET } from '../config/security';
import { prisma } from '../lib/prisma';

export interface JwtPayload {
  userId: string;
  email: string;
  username?: string;
  role: Role;
  companyId: string;
  accessRoleId?: string | null;
  permissions?: string[];
}

// Extend Express Request to carry authenticated user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Validates the Bearer JWT token present in Authorization header.
 * Sets req.user if valid, returns 401 otherwise.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não encontrado. Faça login novamente.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Token de autenticação inválido.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;
    if (!decoded.userId || !decoded.companyId || !decoded.role || !decoded.email) {
      throw new Error('Payload JWT incompleto.');
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, email: true, username: true, role: true, companyId: true, isActive: true, accessRoleId: true,
        accessRole: { select: { enabled: true, permissions: { select: { permission: { select: { key: true } } } } } },
      },
    });
    if (!user || !user.isActive || (user.accessRole && !user.accessRole.enabled)) {
      res.status(401).json({ error: 'Usuário ou cargo inativo.' });
      return;
    }
    req.user = {
      userId: user.id, email: user.email, username: user.username || undefined,
      role: user.role, companyId: user.companyId, accessRoleId: user.accessRoleId,
      permissions: user.role === Role.SUPERADMIN ? ['*'] : user.accessRole?.permissions.map((item) => item.permission.key) || [],
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado.' }); return; }
    if (req.user.role === Role.SUPERADMIN || req.user.permissions?.includes('*') || req.user.permissions?.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Permissão insuficiente.', required: permission });
  };
}

/**
 * Role-based guard factory. Provide an array of allowed roles.
 * Must be used AFTER requireAuth.
 * 
 * Examples:
 *   requireRole([Role.ADMIN])          — admins only
 *   requireRole([Role.ADMIN, Role.MANAGER])  — admin or manager
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Acesso negado. Seu perfil não possui permissão para realizar esta ação.',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }
    next();
  };
}
