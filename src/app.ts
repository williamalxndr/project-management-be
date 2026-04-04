import express, { type Express, type Request, type Response } from 'express';

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { getEnv, type Env } from './config/env.js';
import { createReadinessService, type ReadinessService } from './lib/readiness.js';
import { createAuthenticate, type AuthMiddlewareDependencies } from './middleware/authenticate.js';
import { authorize } from './middleware/authorize.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { buildApiRouter } from './routes/index.js';
import { sendError, sendSuccess } from './shared/http.js';

export interface AppFactoryOptions {
  env?: Env;
  readinessService?: ReadinessService;
  authDependencies?: Partial<AuthMiddlewareDependencies>;
}

export const createApp = ({
  env = getEnv(),
  readinessService = createReadinessService({ env }),
  authDependencies = {},
}: AppFactoryOptions = {}): Express => {
  const app = express();
  const authenticate = createAuthenticate(authDependencies, env);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: env.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: env.jsonBodyLimit }));
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_request: Request, response: Response) => {
    return sendSuccess(response, 'Service healthy', {
      status: 'ok',
      environment: env.nodeEnv,
      supabaseEnabled: env.supabaseEnabled,
    });
  });

  app.get('/ready', async (_request: Request, response: Response) => {
    const report = await readinessService.check();

    if (report.ok) {
      return sendSuccess(response, report.message, report);
    }

    return sendError(response, report.message, report.errors ?? null, 503);
  });

  app.use('/api/v1', buildApiRouter());

  if (env.nodeEnv === 'test') {
    app.get('/_test/protected', authenticate, (request: Request, response: Response) => {
      return sendSuccess(response, 'Authenticated request accepted', {
        user: request.auth ?? null,
      });
    });

    app.get(
      '/_test/manager',
      authenticate,
      authorize('MANAGER'),
      (request: Request, response: Response) => {
        return sendSuccess(response, 'Manager request accepted', {
          user: request.auth ?? null,
        });
      }
    );
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
