import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';
import {
  LEGACY_PROFILE_ROLE_HINT,
  LEGACY_PROFILE_ROLE_MESSAGE,
  SUPABASE_AUTH_REQUEST_FAILED_MESSAGE,
} from '../src/modules/auth/auth.errors.js';
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
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T16:00:00.000Z',
        }),
        getProfileByUserId: vi.fn().mockResolvedValue({
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
        }),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
        },
      },
    });
  });

  it('returns 401 when the login credentials are invalid', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi
          .fn()
          .mockRejectedValue(new HttpError('Invalid email or password', 401)),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'admin@example.com',
        password: 'wrong-password',
      },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Invalid email or password');
  });

  it('returns 502 when the login request to Supabase fails upstream', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi
          .fn()
          .mockRejectedValue(
            new HttpError(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE, 502, {
              auth: 'fetch failed',
            })
          ),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'admin@example.com',
        password: 'secret-password',
      },
    });

    expect(result.status).toBe(502);
    expect(result.body.message).toBe(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE);
    expect(result.body.errors).toEqual({
      auth: 'fetch failed',
    });
  });

  it('returns 403 when login succeeds in Supabase but no matching profile exists', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
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
        email: 'admin@example.com',
        password: 'secret-password',
      },
    });

    expect(result.status).toBe(403);
    expect(result.body.message).toBe('User profile not found');
  });

  it('returns 503 when login resolves a legacy manager profile that requires migration', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T16:00:00.000Z',
        }),
        getProfileByUserId: vi
          .fn()
          .mockRejectedValue(
            new HttpError(LEGACY_PROFILE_ROLE_MESSAGE, 503, {
              role: LEGACY_PROFILE_ROLE_HINT,
            })
          ),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'admin@example.com',
        password: 'secret-password',
      },
    });

    expect(result.status).toBe(503);
    expect(result.body.message).toBe(LEGACY_PROFILE_ROLE_MESSAGE);
    expect(result.body.errors).toEqual({
      role: LEGACY_PROFILE_ROLE_HINT,
    });
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
        email: 'admin@example.com',
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
          email: 'admin@example.com',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T17:00:00.000Z',
        }),
        getProfileByUserId: vi.fn().mockResolvedValue({
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
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
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
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

  it('returns 502 when the refresh request to Supabase fails upstream', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        refreshAuthSession: vi
          .fn()
          .mockRejectedValue(
            new HttpError(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE, 502, {
              auth: 'refresh failed',
            })
          ),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: {
        refreshToken: 'refresh-token',
      },
    });

    expect(result.status).toBe(502);
    expect(result.body.message).toBe(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE);
    expect(result.body.errors).toEqual({
      auth: 'refresh failed',
    });
  });

  it('returns 403 when refresh succeeds in Supabase but no matching profile exists', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        refreshAuthSession: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
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

  it('returns 503 when refresh resolves a legacy manager profile that requires migration', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        refreshAuthSession: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T17:00:00.000Z',
        }),
        getProfileByUserId: vi
          .fn()
          .mockRejectedValue(
            new HttpError(LEGACY_PROFILE_ROLE_MESSAGE, 503, {
              role: LEGACY_PROFILE_ROLE_HINT,
            })
          ),
      },
    });

    const result = await invokeApp(app, {
      method: 'POST',
      path: '/api/v1/auth/refresh',
      body: {
        refreshToken: 'refresh-token',
      },
    });

    expect(result.status).toBe(503);
    expect(result.body.message).toBe(LEGACY_PROFILE_ROLE_MESSAGE);
    expect(result.body.errors).toEqual({
      role: LEGACY_PROFILE_ROLE_HINT,
    });
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

  it('returns 502 when the logout request to Supabase fails upstream', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        logoutSession: vi
          .fn()
          .mockRejectedValue(
            new HttpError(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE, 502, {
              auth: 'logout failed',
            })
          ),
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

    expect(result.status).toBe(502);
    expect(result.body.message).toBe(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE);
    expect(result.body.errors).toEqual({
      auth: 'logout failed',
    });
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

  it('accepts the login access token for /me and rejects the refresh token', async () => {
    const getProfileByUserId = vi.fn().mockResolvedValue({
      id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    });
    const app = createApp({
      env: testEnv,
      authDependencies: {
        signInWithPassword: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          accessToken: 'login-access-token',
          refreshToken: 'login-refresh-token',
          tokenType: 'bearer',
          expiresIn: 3600,
          expiresAt: '2026-04-07T16:00:00.000Z',
        }),
        verifyAccessToken: vi.fn().mockImplementation(async (token: string) => {
          if (token !== 'login-access-token') {
            throw new HttpError('Invalid or expired access token', 401);
          }

          return {
            userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
            email: 'admin@example.com',
          };
        }),
        getProfileByUserId,
      },
    });

    const loginResult = await invokeApp<{
      success: boolean;
      message: string;
      data: {
        accessToken: string;
        refreshToken: string;
      };
    }>(app, {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        email: 'admin@example.com',
        password: 'secret-password',
      },
    });
    const meWithAccessToken = await invokeApp<{
      success: boolean;
      message: string;
      data: {
        role: string;
      };
    }>(app, {
      path: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${loginResult.body.data.accessToken}`,
      },
    });
    const meWithRefreshToken = await invokeApp<{
      success: boolean;
      message: string;
      errors: Record<string, string> | null;
    }>(app, {
      path: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${loginResult.body.data.refreshToken}`,
      },
    });

    expect(loginResult.status).toBe(200);
    expect(meWithAccessToken.status).toBe(200);
    expect(meWithAccessToken.body.data.role).toBe('ADMIN');
    expect(meWithRefreshToken.status).toBe(401);
    expect(meWithRefreshToken.body.message).toBe('Invalid or expired access token');
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

  it('returns 502 when access-token verification fails upstream', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi
          .fn()
          .mockRejectedValue(
            new HttpError(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE, 502, {
              auth: 'jwks timed out',
            })
          ),
        getProfileByUserId: vi.fn(),
      },
    });

    const result = await invokeApp(app, {
      path: '/api/v1/auth/me',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(result.status).toBe(502);
    expect(result.body.message).toBe(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE);
    expect(result.body.errors).toEqual({
      auth: 'jwks timed out',
    });
  });

  it('returns 403 when the Supabase user has no matching profile', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
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

  it('returns 503 when the Supabase user has a legacy manager profile that requires migration', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
        }),
        getProfileByUserId: vi
          .fn()
          .mockRejectedValue(
            new HttpError(LEGACY_PROFILE_ROLE_MESSAGE, 503, {
              role: LEGACY_PROFILE_ROLE_HINT,
            })
          ),
      },
    });

    const result = await invokeApp(app, {
      path: '/api/v1/auth/me',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(result.status).toBe(503);
    expect(result.body.message).toBe(LEGACY_PROFILE_ROLE_MESSAGE);
    expect(result.body.errors).toEqual({
      role: LEGACY_PROFILE_ROLE_HINT,
    });
  });

  it('returns 200 with the authenticated user profile', async () => {
    const app = createApp({
      env: testEnv,
      authDependencies: {
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
        }),
        getProfileByUserId: vi.fn().mockResolvedValue({
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
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
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
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
