import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { companyRouter } from './company.routes';
import { locationRouter } from './location.routes';
import { assetRouter } from './asset.routes';
import { visitRouter } from './visit.routes';
import { statsRouter } from './stats.routes';
import { uploadRouter } from './upload.routes';
import { syncRouter } from './sync.routes';
import { checklistRouter } from './checklist.routes';
import { issueRouter } from './issue.routes';
import { reportRouter } from './report.routes';
import { notificationRouter } from './notification.routes';
import { peripheralRouter } from './peripheral.routes';
import { ticketRouter } from './ticket.routes';
import { adminRouter } from './admin.routes';
import { settingsRouter } from './settings.routes';
import { sectorRouter } from './sector.routes';
import { categoryRouter } from './category.routes';
import { requireAuth, requirePermission, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { onboardingRateLimiter } from '../middlewares/rateLimit.middleware';
import { lensRouter } from './lens.routes';
import { webhookRouter } from './webhook.routes';

export const routes = Router();

// ─── Public Routes ───────────────────────────────────────────────────────────
routes.use('/api', healthRouter);
routes.use('/api/webhooks', webhookRouter);
routes.use('/api/auth', authRouter);

// /api/assets/onboard is intentionally public for PowerShell script ingestion.
// It has its own audit log. All other /api/assets/* require auth.
routes.post('/api/assets/onboard', onboardingRateLimiter, assetRouter);

// Locations GET is public so the /onboard page (unauthenticated) can load sectors.
// Write operations (POST/PATCH/DELETE) require auth — enforced inside locationRouter.
routes.use('/api/locations', locationRouter);

// ─── Protected Routes — require valid JWT ─────────────────────────────────────
routes.use('/api/companies',    requireAuth, companyRouter);
routes.use('/api/lens', requireAuth, requirePermission('devices.view'), lensRouter);
routes.use('/api/assets', requireAuth, (req, res, next) =>
  requirePermission(req.method === 'GET' ? 'devices.view' : req.method === 'POST' ? 'devices.create' : 'devices.manage')(req, res, next), assetRouter);
routes.use('/api/peripherals', requireAuth, (req, res, next) =>
  requirePermission(req.method === 'GET' ? 'devices.view' : req.method === 'POST' ? 'devices.create' : 'devices.manage')(req, res, next), peripheralRouter);
routes.use('/api/tickets',      requireAuth, ticketRouter);
routes.use('/api/visits',       requireAuth, visitRouter);
routes.use('/api/stats',        requireAuth, statsRouter);
routes.use('/api/upload',       requireAuth, uploadRouter);
routes.use('/api/sync',         requireAuth, syncRouter);
routes.use('/api/checklists',   requireAuth, checklistRouter);
routes.use('/api/issues',       requireAuth, issueRouter);
routes.use('/api/reports',      requireAuth, reportRouter);
routes.use('/api/notifications', requireAuth, notificationRouter);
routes.use('/api/settings',     requireAuth, requireRole([Role.SUPERADMIN, Role.ADMIN]), settingsRouter);
// Any authenticated user may list sectors to open a ticket. Mutation RBAC lives
// inside sectorRouter so management remains restricted to administrators.
routes.use('/api/sectors',      requireAuth, sectorRouter);
routes.use('/api/categories',   requireAuth, categoryRouter);
routes.use('/api/whatsapp',     requireAuth, requireRole([Role.SUPERADMIN, Role.ADMIN]));

// ─── Admin Backoffice — SUPERADMIN & ADMIN only ───────────────────────────────
routes.use('/api/admin', requireAuth, requireRole([Role.SUPERADMIN, Role.ADMIN]), adminRouter);
