import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';
import { invokeApp } from './support/invoke.js';

const testEnv: Env = {
  nodeEnv: 'test',
  port: 3000,
  supabaseEnabled: true,
  supabaseConfigured: true,
  supabaseUrl: 'https://example.supabase.co',
  supabaseServiceRoleKey: 'service-role-key',
  supabaseJwtAudience: 'authenticated',
  supabaseStorageBucket: 'task-evidence',
  corsOrigin: 'http://localhost:3000',
  jsonBodyLimit: '10mb',
  logLevel: 'info',
};

describe('app routes', () => {
  it('returns 200 for /health with the standard envelope', async () => {
    const app = createApp({
      env: testEnv,
      readinessService: {
        check: async () => ({
          ok: true,
          message: 'Service ready',
          checks: {
            database: 'ok',
            storage: 'placeholder',
          },
        }),
      },
      authDependencies: {
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
        }),
        getProfileByUserId: vi.fn().mockResolvedValue({
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'MANAGER',
        }),
      },
    });

    const result = await invokeApp(app, { path: '/health' });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Service healthy',
      data: {
        status: 'ok',
        environment: 'test',
        supabaseEnabled: true,
      },
    });
  });

  it('returns ready status when Supabase is available', async () => {
    const app = createApp({
      env: testEnv,
      readinessService: {
        check: async () => ({
          ok: true,
          message: 'Service ready',
          checks: {
            database: 'ok',
            storage: 'placeholder',
          },
        }),
      },
      authDependencies: {
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
        }),
        getProfileByUserId: vi.fn().mockResolvedValue({
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'MANAGER',
        }),
      },
    });

    const result = await invokeApp(app, { path: '/ready' });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.checks.database).toBe('ok');
  });

  it('returns degraded status when Supabase is unavailable', async () => {
    const app = createApp({
      env: testEnv,
      readinessService: {
        check: async () => ({
          ok: false,
          message: 'Supabase readiness check failed',
          checks: {
            database: 'error',
            storage: 'placeholder',
          },
          errors: {
            database: 'connection failed',
          },
        }),
      },
      authDependencies: {
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
        }),
        getProfileByUserId: vi.fn().mockResolvedValue({
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'MANAGER',
        }),
      },
    });

    const result = await invokeApp(app, { path: '/ready' });

    expect(result.status).toBe(503);
    expect(result.body.success).toBe(false);
    expect(result.body.errors.database).toBe('connection failed');
  });

  it('returns degraded readiness when running locally without Supabase configured', async () => {
    const localEnv: Env = {
      ...testEnv,
      nodeEnv: 'development',
      supabaseEnabled: false,
      supabaseConfigured: false,
      supabaseUrl: null,
      supabaseServiceRoleKey: null,
    };

    const app = createApp({
      env: localEnv,
    });

    const result = await invokeApp(app, { path: '/ready' });

    expect(result.status).toBe(503);
    expect(result.body.success).toBe(false);
    expect(result.body.message).toBe('Supabase is disabled for local development');
  });

  it('verifies the protected route harness for 401, 403, and 200 responses', async () => {
    const app = createApp({
      env: testEnv,
      readinessService: {
        check: async () => ({
          ok: true,
          message: 'Service ready',
          checks: {
            database: 'ok',
            storage: 'placeholder',
          },
        }),
      },
      authDependencies: {
        verifyAccessToken: vi.fn().mockImplementation(async (token: string) => ({
          userId:
            token === 'manager-token'
              ? '6c4527e2-5be2-4db9-ba40-958f9e43a7e6'
              : 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: token === 'manager-token' ? 'manager@example.com' : 'supervisor@example.com',
        })),
        getProfileByUserId: vi.fn().mockImplementation(async (userId: string) => ({
          id: userId,
          email:
            userId === '6c4527e2-5be2-4db9-ba40-958f9e43a7e6'
              ? 'manager@example.com'
              : 'supervisor@example.com',
          name: userId === '6c4527e2-5be2-4db9-ba40-958f9e43a7e6' ? 'Manager' : 'Supervisor',
          role: userId === '6c4527e2-5be2-4db9-ba40-958f9e43a7e6' ? 'MANAGER' : 'SUPERVISOR',
        })),
      },
    });

    const unauthorized = await invokeApp(app, { path: '/_test/protected' });
    expect(unauthorized.status).toBe(401);

    const forbidden = await invokeApp(app, {
      path: '/_test/manager',
      headers: { authorization: 'Bearer supervisor-token' },
    });
    expect(forbidden.status).toBe(403);

    const allowed = await invokeApp(app, {
      path: '/_test/manager',
      headers: { authorization: 'Bearer manager-token' },
    });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.user.role).toBe('MANAGER');
  });
});
