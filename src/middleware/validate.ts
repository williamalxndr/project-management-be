import type { NextFunction, Request, Response } from 'express';

import type { ZodTypeAny } from 'zod';

import { HttpError } from '../shared/errors.js';

type ValidationTarget = 'body' | 'params' | 'query';

export const validate =
  <Schema extends ZodTypeAny>(schema: Schema, target: ValidationTarget = 'body') =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(request[target]);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      const errors = Object.fromEntries(
        Object.entries(fieldErrors).flatMap(([key, value]) => {
          const message = value?.[0];
          return message ? [[key, message]] : [];
        })
      );

      next(new HttpError('Validation failed', 400, errors));
      return;
    }

    request[target] = parsed.data;
    next();
  };
