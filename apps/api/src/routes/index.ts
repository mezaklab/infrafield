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
import { requireAuth } from '../middlewares/auth.middleware';

export const routes = Router();

// Public routes
routes.use('/api', healthRouter);
routes.use('/api/auth', authRouter);

// Protected routes — require valid JWT
routes.use('/api/companies', requireAuth, companyRouter);
routes.use('/api/locations', requireAuth, locationRouter);
routes.use('/api/assets', requireAuth, assetRouter);
routes.use('/api/visits', requireAuth, visitRouter);
routes.use('/api/stats', requireAuth, statsRouter);
routes.use('/api/upload', requireAuth, uploadRouter);
routes.use('/api/sync', requireAuth, syncRouter);
routes.use('/api/checklists', requireAuth, checklistRouter);
routes.use('/api/issues', requireAuth, issueRouter);
routes.use('/api/reports', requireAuth, reportRouter);
routes.use('/api/notifications', requireAuth, notificationRouter);


