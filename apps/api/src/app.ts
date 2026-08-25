import express, { ErrorRequestHandler, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { routes } from './routes';
import { getAllowedOrigins, isCorsOriginAllowed } from './config/security';
import { apiRateLimiter } from './middlewares/rateLimit.middleware';

export const createApp = (): Express => {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production' ? 1 : false);

  // Security headers with Helmet (allow cross origin resource sharing for uploads)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin, { allowedOrigins })) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não permitida pelo CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  }));

  // Body parser (increase limit for Base64 image fallback)
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use('/api', apiRateLimiter);

  // Static files for Uploads
  const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  // Register routes
  app.use(routes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error('[API] Erro não tratado na requisição:', error);
    if (res.headersSent) return;
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'JSON inválido.' });
      return;
    }
    if (error instanceof Error && error.message === 'Origem não permitida pelo CORS.') {
      res.status(403).json({ error: 'Origem não permitida.' });
      return;
    }
    const status = typeof error?.status === 'number' && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : 'Requisição inválida.' });
  };
  app.use(errorHandler);

  return app;
};
