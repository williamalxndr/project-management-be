import type { Request, Response } from 'express';

import { sendError } from '../shared/http.js';

export const notFoundHandler = (request: Request, response: Response): Response => {
  return sendError(response, `Route not found: ${request.method} ${request.originalUrl}`, null, 404);
};
