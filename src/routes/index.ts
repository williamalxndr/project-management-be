import { Router, type RequestHandler } from 'express';

import { approvalsRouter } from '../modules/approvals/approvals.routes.js';
import { buildAuthRouter } from '../modules/auth/auth.routes.js';
import { progressRouter } from '../modules/progress/progress.routes.js';
import { projectsRouter } from '../modules/projects/projects.routes.js';
import { tasksRouter } from '../modules/tasks/tasks.routes.js';

export interface ApiRouterDependencies {
  authenticate: RequestHandler;
}

export const buildApiRouter = ({ authenticate }: ApiRouterDependencies): Router => {
  const router = Router();

  router.use('/auth', buildAuthRouter({ authenticate }));
  router.use('/projects', projectsRouter);
  router.use('/tasks', tasksRouter);
  router.use('/tasks', progressRouter);
  router.use('/tasks', approvalsRouter);

  return router;
};
