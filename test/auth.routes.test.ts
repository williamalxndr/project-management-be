import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';
import { HttpError } from '../src/shared/errors.js';
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

describe('auth routes', () => {
  it('returns 401 when authorization header is missing', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi.fn(),
        getProfileByUserId: vi.fn(),
      },
    });

    const result = await invokeApp(app, { path: '/api/v1/auth/me' });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Authentication required');
  });

  it('returns 401 when authorization header is malformed', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi.fn(),
        getProfileByUserId: vi.fn(),
      },
    });

    const result = await invokeApp(app, {
      path: '/api/v1/auth/me',
      headers: { authorization: 'Token abc' },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Authentication required');
  });

  it('returns 401 when the access token is invalid', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi.fn().mockRejectedValue(new Error('bad token')),
        getProfileByUserId: vi.fn(),
      },
    });

    const result = await invokeApp(app, {
      path: '/api/v1/auth/me',
      headers: { authorization: 'Bearer bad-token' },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Invalid or expired access token');
  });

  it('returns 403 when the Supabase user has no matching profile', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
        }),
        getProfileByUserId: vi
          .fn()
          .mockRejectedValue(new HttpError('User profile not found', 403)),
      },
    });

    const result = await invokeApp(app, {
      path: '/api/v1/auth/me',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(result.status).toBe(403);
    expect(result.body.message).toBe('User profile not found');
  });

  it('returns 200 with the authenticated user profile', async () => {
    const app = createApp({
      env: testEnv,
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

    const result = await invokeApp(app, {
      path: '/api/v1/auth/me',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Authenticated user retrieved',
      data: {
        id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
        email: 'manager@example.com',
        name: 'Manager',
        role: 'MANAGER',
      },
    });
  });

  it('returns 503 when Supabase auth is disabled locally', async () => {
    const app = createApp({
      env: {
        ...testEnv,
        nodeEnv: 'development',
        supabaseEnabled: false,
        supabaseConfigured: false,
        supabaseUrl: null,
        supabaseServiceRoleKey: null,
      },
    });

    const result = await invokeApp(app, {
      path: '/api/v1/auth/me',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(result.status).toBe(503);
    expect(result.body.message).toBe(
      'Authentication is unavailable because Supabase is not configured for local development'
    );
    expect(result.body.errors).toEqual({
      auth: 'Set SUPABASE_ENABLED=true and configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    });
  });
});
