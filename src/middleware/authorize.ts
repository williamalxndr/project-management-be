import type { NextFunction, Request, Response } from 'express';

import type { AppRole } from '../shared/types.js';
import { HttpError } from '../shared/errors.js';

export const authorize =
  (...roles: AppRole[]) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth) {
      next(new HttpError('Authentication required', 401));
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(new HttpError('Forbidden: insufficient permissions', 403));
      return;
    }

    next();
  };
