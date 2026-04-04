import type { NextFunction, Request, Response } from 'express';

import { ZodError } from 'zod';

import { logger } from '../lib/logger.js';
import { EnvValidationError, HttpError } from '../shared/errors.js';
import { sendError } from '../shared/http.js';

const flattenZodErrors = (error: ZodError): Record<string, string> => {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, value]) => {
      const message = value?.[0];
      return message ? [[key, message]] : [];
    })
  );
};

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): Response => {
  if (error instanceof HttpError) {
    return sendError(response, error.message, error.errors, error.statusCode);
  }

  if (error instanceof EnvValidationError) {
    return sendError(response, error.message, error.issues, 500);
  }

  if (error instanceof ZodError) {
    return sendError(response, 'Validation failed', flattenZodErrors(error), 400);
  }

  logger.error('Unhandled application error', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });

  return sendError(response, 'Internal server error', null, 500);
};
