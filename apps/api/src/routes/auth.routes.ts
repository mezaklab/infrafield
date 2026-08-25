import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middlewares/auth.middleware';
import { loginRateLimiter, passwordRateLimiter, passwordResetRequestRateLimiter } from '../middlewares/rateLimit.middleware';
import crypto from 'crypto';
import { passwordSchema } from '../utils/passwordPolicy';
import { sendPasswordResetEmail } from '../services/mail.service';
import { JWT_AUDIENCE, JWT_EXPIRES_IN, JWT_ISSUER, JWT_SECRET } from '../config/security';

export const authRouter = Router();
const resetTokenStore = prisma.passwordResetToken;

const LoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Identificador (usuário ou e-mail) é obrigatório').max(254),
  password: z.string().min(1, 'Senha é obrigatória').max(128),
  rememberMe: z.boolean().optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
const ForgotPasswordSchema = z.object({ email: z.string().trim().email('E-mail inválido').max(254) });
const ResetPasswordSchema = z.object({ token: z.string().min(32).max(256), password: passwordSchema, passwordConfirmation: z.string().max(128) }).refine((data) => data.password === data.passwordConfirmation, { message: 'As senhas não coincidem.', path: ['passwordConfirmation'] });
const RESET_MESSAGE = 'Se existir uma conta vinculada a este e-mail, você receberá as instruções para redefinir sua senha.';
const resetMinutes = () => Math.max(5, Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30));
const auditAuth = async (action: string, user: string, details: string) => {
  try { await prisma.auditLog.create({ data: { action, user, role: 'SYSTEM', details } }); } catch { /* audit must not disclose reset state */ }
};

// POST /api/auth/login
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const { identifier, password, rememberMe } = parsed.data;
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
        accessRole: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    if (!user.isActive || (user.accessRole && !user.accessRole.enabled)) {
      return res.status(403).json({ error: 'Usuário ou cargo inativo.' });
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
      accessRoleId: user.accessRoleId,
    };

    const expiresIn = rememberMe ? '30d' : JWT_EXPIRES_IN;

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn,
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
        isActive: user.isActive,
        accessRole: user.accessRole ? { id: user.accessRole.id, key: user.accessRole.key, name: user.accessRole.name } : null,
        permissions: user.role === 'SUPERADMIN' ? ['*'] : user.accessRole?.permissions.map((item) => item.permission.key) || [],
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar o login.' });
  }
});

authRouter.post('/forgot-password', passwordResetRequestRateLimiter, async (req: Request, res: Response) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe um e-mail válido.' });
  const email = parsed.data.email.toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.isActive) {
      console.info('[PASSWORD_RESET] user found');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + resetMinutes() * 60 * 1000);
      await prisma.$transaction([
        resetTokenStore.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
        resetTokenStore.create({ data: { userId: user.id, tokenHash, expiresAt } }),
      ]);
      console.info('[PASSWORD_RESET] old tokens invalidated');
      console.info('[PASSWORD_RESET] token created');
      const publicUrl = (process.env.APP_PUBLIC_URL || process.env.WEB_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
      console.info('[PASSWORD_RESET] sending email');
      const emailSent = await sendPasswordResetEmail(user.email, `${publicUrl}/reset-password?token=${rawToken}`, resetMinutes());
      if (emailSent) console.info(`[PASSWORD_RESET] email sent to ${maskEmail(user.email)}`);
      else console.info('[PASSWORD_RESET] email delivery skipped (SMTP unavailable)');
      await auditAuth('PASSWORD_RESET_REQUESTED', user.email, 'Solicitação de redefinição de senha criada.');
    }
    return res.json({ message: RESET_MESSAGE });
  } catch (error) {
    console.error('[PASSWORD_RESET] mail/database failed:', error instanceof Error ? error.message : error);
    return res.json({ message: RESET_MESSAGE });
  }
});

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

authRouter.post('/reset-password', passwordRateLimiter, async (req: Request, res: Response) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' });
  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  try {
    const token = await resetTokenStore.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt <= new Date()) return res.status(400).json({ error: 'Este link de recuperação é inválido ou expirou.' });
    const hashed = await bcrypt.hash(parsed.data.password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: token.userId }, data: { password: hashed } }),
      resetTokenStore.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    ]);
    await auditAuth('PASSWORD_RESET_COMPLETED', token.userId, 'Redefinição de senha concluída.');
    return res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('[AUTH] Reset password error:', error);
    return res.status(500).json({ error: 'Não foi possível redefinir a senha.' });
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
        isActive: true,
        accessRole: { include: { permissions: { include: { permission: true } } } },
        company: { select: { id: true, name: true } },
        locationId: true,
        location: { select: { id: true, name: true, building: true, room: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      ...user,
      permissions: user.role === 'SUPERADMIN' ? ['*'] : user.accessRole?.permissions.map((item) => item.permission.key) || [],
    });
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
