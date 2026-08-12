import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const jsonHandler = (_req: Request, res: Response) => {
  res.status(429).json({ error: 'Muitas requisições. Aguarde alguns minutos e tente novamente.' });
};

const baseOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  handler: jsonHandler,
};

export const apiRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 500,
});

export const loginRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const passwordRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

export const ticketCreationRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 10,
});

export const onboardingRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});
