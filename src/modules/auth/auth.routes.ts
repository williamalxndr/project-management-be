import { Router, type Request, type RequestHandler, type Response } from 'express';

import { HttpError } from '../../shared/errors.js';
import { sendSuccess } from '../../shared/http.js';

export interface AuthRouterDependencies {
  authenticate: RequestHandler;
}

export const buildAuthRouter = ({ authenticate }: AuthRouterDependencies): Router => {
  const router = Router();

  router.get('/me', authenticate, (request: Request, response: Response) => {
    if (!request.auth) {
      throw new HttpError('Authentication required', 401);
    }

    return sendSuccess(response, 'Authenticated user retrieved', request.auth);
  });

  return router;
};
