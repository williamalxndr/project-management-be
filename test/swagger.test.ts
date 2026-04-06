import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';
import { invokeApp } from './support/invoke.js';

const testEnv: Env = {
  nodeEnv: 'test',
  port: 3000,
  supabaseEnabled: true,
  supabaseConfigured: true,
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'publishable-key',
  supabaseServiceRoleKey: 'service-role-key',
  supabaseJwtAudience: 'authenticated',
  supabaseStorageBucket: 'task-evidence',
  corsOrigin: 'http://localhost:3000',
  jsonBodyLimit: '10mb',
  logLevel: 'info',
};

describe('swagger docs', () => {
  it('serves the raw OpenAPI document', async () => {
    const app = createApp({
      env: testEnv,
    });

    const result = await invokeApp<Record<string, unknown>>(app, {
      path: '/docs/openapi.json',
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      openapi: '3.0.3',
      info: {
        title: 'Field Operations Project Management API',
      },
    });

    const paths = (result.body.paths as Record<string, unknown>) ?? {};
    expect(paths).toHaveProperty('/health');
    expect(paths).toHaveProperty('/ready');
    expect(paths).toHaveProperty('/api/v1/auth/login');
    expect(paths).toHaveProperty('/api/v1/auth/refresh');
    expect(paths).toHaveProperty('/api/v1/auth/logout');
    expect(paths).toHaveProperty('/api/v1/auth/me');
    expect(result.body).toMatchObject({
      paths: {
        '/api/v1/auth/login': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  example: {
                    email: 'admin@example.com',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it('serves Swagger UI', async () => {
    const app = createApp({
      env: testEnv,
    });

    const result = await invokeApp<string>(app, {
      path: '/docs/',
    });

    expect(result.status).toBe(200);
    expect(result.body).toContain('swagger-ui');
    expect(result.body).toContain('Field Operations Project Management API');
  });
});
