import type { Response } from 'express';

import type { ApiError, ApiSuccess } from './types.js';

export const sendSuccess = <T>(
  response: Response,
  message: string,
  data: T,
  statusCode = 200
): Response<ApiSuccess<T>> => {
  return response.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  response: Response,
  message: string,
  errors: Record<string, string> | null = null,
  statusCode = 400
): Response<ApiError> => {
  return response.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
