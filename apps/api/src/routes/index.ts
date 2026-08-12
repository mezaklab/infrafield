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
import { settingsRouter, whatsappRouter } from './settings.routes';
import { sectorRouter } from './sector.routes';
import { categoryRouter } from './category.routes';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { onboardingRateLimiter } from '../middlewares/rateLimit.middleware';

export const routes = Router();

// ─── Public Routes ───────────────────────────────────────────────────────────
routes.use('/api', healthRouter);
routes.use('/api/auth', authRouter);

// /api/assets/onboard is intentionally public for PowerShell script ingestion.
// It has its own audit log. All other /api/assets/* require auth.
routes.post('/api/assets/onboard', onboardingRateLimiter, assetRouter);

// Locations GET is public so the /onboard page (unauthenticated) can load sectors.
// Write operations (POST/PATCH/DELETE) require auth — enforced inside locationRouter.
routes.use('/api/locations', locationRouter);

// ─── Protected Routes — require valid JWT ─────────────────────────────────────
routes.use('/api/companies',    requireAuth, companyRouter);
routes.use('/api/assets',       requireAuth, assetRouter);
routes.use('/api/peripherals',  requireAuth, peripheralRouter);
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
routes.use('/api/sectors',      requireAuth, requireRole([Role.SUPERADMIN, Role.ADMIN]), sectorRouter);
routes.use('/api/categories',   requireAuth, categoryRouter);
routes.use('/api/whatsapp',     requireAuth, requireRole([Role.SUPERADMIN, Role.ADMIN]), whatsappRouter);

// ─── Admin Backoffice — SUPERADMIN & ADMIN only ───────────────────────────────
routes.use('/api/admin', requireAuth, requireRole([Role.SUPERADMIN, Role.ADMIN]), adminRouter);
