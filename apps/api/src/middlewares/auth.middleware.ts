import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET } from '../config/security';

export interface JwtPayload {
  userId: string;
  email: string;
  username?: string;
  role: Role;
  companyId: string;
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
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }
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
