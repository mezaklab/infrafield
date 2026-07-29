import { Router, Request, Response } from 'express';
import { z } from 'zod';

export const healthRouter = Router();

const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
  environment: z.string(),
});

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const healthData = {
    status: 'online',
    service: 'InfraField API',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  // Validate response with Zod schema
  const parsed = HealthResponseSchema.safeParse(healthData);

  if (!parsed.success) {
    return res.status(500).json({ status: 'error', errors: parsed.error.format() });
  }

  return res.status(200).json(parsed.data);
});
