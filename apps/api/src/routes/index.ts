import { Router } from 'express';
import { healthRouter } from './health.routes';
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

export const routes = Router();

routes.use('/api', healthRouter);
routes.use('/api/companies', companyRouter);
routes.use('/api/locations', locationRouter);
routes.use('/api/assets', assetRouter);
routes.use('/api/visits', visitRouter);
routes.use('/api/stats', statsRouter);
routes.use('/api/upload', uploadRouter);
routes.use('/api/sync', syncRouter);
routes.use('/api/checklists', checklistRouter);
routes.use('/api/issues', issueRouter);
routes.use('/api/reports', reportRouter);
