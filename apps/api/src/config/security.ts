import 'dotenv/config';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const configuredJwtSecret = process.env.JWT_SECRET?.trim();

if (isProduction && (!configuredJwtSecret || configuredJwtSecret.length < 32)) {
  throw new Error('JWT_SECRET deve estar configurado com pelo menos 32 caracteres em produção.');
}

export const JWT_SECRET = configuredJwtSecret || crypto.randomBytes(32).toString('hex');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
export const JWT_ISSUER = 'infrafield-api';
export const JWT_AUDIENCE = 'infrafield-web';

if (!configuredJwtSecret) {
  console.warn('[Security] JWT_SECRET ausente: usando segredo efêmero apenas para desenvolvimento.');
}

export function getAllowedOrigins(): string[] {
  const configured = [process.env.WEB_APP_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
    .map((origin) => origin?.trim().replace(/\/+$/, ''))
    .filter((origin): origin is string => Boolean(origin));

  if (!isProduction) {
    configured.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return Array.from(new Set(configured));
}
