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
  supabasePublishableKey: 'publishable-key',
  supabaseServiceRoleKey: 'service-role-key',
  supabaseJwtAudience: 'authenticated',
  supabaseStorageBucket: 'task-evidence',
  corsOrigin: 'http://localhost:3000',
  jsonBodyLimit: '10mb',
  logLevel: 'info',
};

describe('auth routes', () => {
  it('returns 400 when the login body is invalid', async () => {
    const app = createApp({
      env: testEnv,
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'manager@example.com',
        password: '',
      },
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Validation failed');
    expect(result.body.errors).toEqual({
      password: 'Too small: expected string to have >=1 characters',
    });
  });

  it('returns 200 with the created authenticated session', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T16:00:00.000Z',
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
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'manager@example.com',
        password: 'secret-password',
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Authenticated session created',
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'bearer',
        expiresIn: 3600,
        expiresAt: '2026-04-07T16:00:00.000Z',
        user: {
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'MANAGER',
        },
      },
    });
  });

  it('returns 401 when the login credentials are invalid', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi.fn().mockRejectedValue(new HttpError('Invalid email or password', 401)),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'manager@example.com',
        password: 'wrong-password',
      },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Invalid email or password');
  });

  it('returns 403 when login succeeds in Supabase but no matching profile exists', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T16:00:00.000Z',
        }),
        getProfileByUserId: vi
          .fn()
          .mockRejectedValue(new HttpError('User profile not found', 403)),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'manager@example.com',
        password: 'secret-password',
      },
    });

    expect(result.status).toBe(403);
    expect(result.body.message).toBe('User profile not found');
  });

  it('returns 503 for login when Supabase auth is disabled locally', async () => {
    const app = createApp({
      env: {
        ...testEnv,
        nodeEnv: 'development',
        supabaseEnabled: false,
        supabaseConfigured: false,
        supabaseUrl: null,
        supabasePublishableKey: null,
        supabaseServiceRoleKey: null,
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'manager@example.com',
        password: 'secret-password',
      },
    });

    expect(result.status).toBe(503);
    expect(result.body.message).toBe(
      'Authentication is unavailable because Supabase is not configured for local development'
    );
    expect(result.body.errors).toEqual({
      auth: 'Set SUPABASE_ENABLED=true and configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY',
    });
  });

  it('returns 400 when the refresh body is invalid', async () => {
    const app = createApp({
      env: testEnv,
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: {
        refreshToken: '',
      },
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Validation failed');
    expect(result.body.errors).toEqual({
      refreshToken: 'Too small: expected string to have >=1 characters',
    });
  });

  it('returns 200 with the refreshed authenticated session', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        refreshAuthSession: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T17:00:00.000Z',
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
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: {
        refreshToken: 'refresh-token',
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Authenticated session refreshed',
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'bearer',
        expiresIn: 3600,
        expiresAt: '2026-04-07T17:00:00.000Z',
        user: {
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'MANAGER',
        },
      },
    });
  });

  it('returns 401 when the refresh token is invalid', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        refreshAuthSession: vi
          .fn()
          .mockRejectedValue(new HttpError('Invalid or expired refresh token', 401)),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: {
        refreshToken: 'bad-refresh-token',
      },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Invalid or expired refresh token');
  });

  it('returns 403 when refresh succeeds in Supabase but no matching profile exists', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        refreshAuthSession: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'manager@example.com',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T17:00:00.000Z',
        }),
        getProfileByUserId: vi
          .fn()
          .mockRejectedValue(new HttpError('User profile not found', 403)),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: {
        refreshToken: 'refresh-token',
      },
    });

    expect(result.status).toBe(403);
    expect(result.body.message).toBe('User profile not found');
  });

  it('returns 400 when the logout body is invalid', async () => {
    const app = createApp({
      env: testEnv,
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      body: {
        accessToken: '',
        refreshToken: 'refresh-token',
      },
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Validation failed');
    expect(result.body.errors).toEqual({
      accessToken: 'Too small: expected string to have >=1 characters',
    });
  });

  it('returns 200 when the current authenticated session is revoked', async () => {
    const logoutSession = vi.fn().mockResolvedValue(undefined);
    const app = createApp({
      env: testEnv,
      authDependencies: {
        logoutSession,
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      body: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    expect(result.status).toBe(200);
    expect(logoutSession).toHaveBeenCalledWith({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(result.body).toEqual({
      success: true,
      message: 'Authenticated session revoked',
      data: {
        signedOut: true,
      },
    });
  });

  it('returns 401 when the supplied session tokens cannot be revoked', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        logoutSession: vi
          .fn()
          .mockRejectedValue(new HttpError('Invalid or expired session tokens', 401)),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      body: {
        accessToken: 'bad-access-token',
        refreshToken: 'bad-refresh-token',
      },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Invalid or expired session tokens');
  });

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
        supabasePublishableKey: null,
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
      auth: 'Set SUPABASE_ENABLED=true and configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY',
    });
  });
});
