import { EventEmitter } from 'node:events';

import type { Express } from 'express';
import httpMocks from 'node-mocks-http';

export interface InvokeOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface InvokeResult<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, unknown>;
}

export const invokeApp = async <T = unknown>(
  app: Express,
  { method = 'GET', path, headers, body, query }: InvokeOptions
): Promise<InvokeResult<T>> => {
  const request = httpMocks.createRequest({
    method,
    url: path,
    headers,
    body,
    query,
  });

  const response = httpMocks.createResponse({
    eventEmitter: EventEmitter,
  });

  await new Promise<void>((resolve, reject) => {
    response.on('finish', resolve);
    response.on('error', reject);

    app.handle(request, response, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const rawBody = response._getData();
  let parsedBody = rawBody as T;

  if (typeof rawBody === 'string' && rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody) as T;
    } catch {
      parsedBody = rawBody as T;
    }
  }

  return {
    status: response.statusCode,
    body: parsedBody,
    headers: response._getHeaders(),
  };
};
