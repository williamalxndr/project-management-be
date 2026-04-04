import { Router } from 'express';

import { approvalsRouter } from '../modules/approvals/approvals.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { progressRouter } from '../modules/progress/progress.routes.js';
import { projectsRouter } from '../modules/projects/projects.routes.js';
import { tasksRouter } from '../modules/tasks/tasks.routes.js';

export const buildApiRouter = (): Router => {
  const router = Router();

  router.use('/auth', authRouter);
  router.use('/projects', projectsRouter);
  router.use('/tasks', tasksRouter);
  router.use('/tasks', progressRouter);
  router.use('/tasks', approvalsRouter);

  return router;
};
