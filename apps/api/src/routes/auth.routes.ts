import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middlewares/auth.middleware';
import { loginRateLimiter, passwordRateLimiter } from '../middlewares/rateLimit.middleware';
import { JWT_AUDIENCE, JWT_EXPIRES_IN, JWT_ISSUER, JWT_SECRET } from '../config/security';

export const authRouter = Router();

const LoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Identificador (usuário ou e-mail) é obrigatório').max(254),
  password: z.string().min(1, 'Senha é obrigatória').max(128),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.').max(128),
});

// POST /api/auth/login
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const { identifier, password } = parsed.data;
    const loginInput = identifier.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: loginInput },
          { email: loginInput },
        ],
      },
      include: {
        company: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    } as jwt.SignOptions);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        company: user.company,
        locationId: user.locationId,
        location: user.location,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar o login.' });
  }
});

// GET /api/auth/me — get current authenticated user info (refresh profile data)
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        company: { select: { id: true, name: true } },
        locationId: true,
        location: { select: { id: true, name: true, building: true, room: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil do usuário.' });
  }
});

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth, passwordRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});
