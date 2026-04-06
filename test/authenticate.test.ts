import express from 'express';
import { describe, expect, it, vi } from 'vitest';

import { createAuthenticate } from '../src/middleware/authenticate.js';
import { authorize } from '../src/middleware/authorize.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { sendSuccess } from '../src/shared/http.js';
import { invokeApp } from './support/invoke.js';

describe('authentication middleware', () => {
  it('rejects missing authorization headers', async () => {
    const app = express();

    app.get(
      '/protected',
      createAuthenticate({
        verifyAccessToken: vi.fn(),
        getProfileByUserId: vi.fn(),
      }),
      (_request, response) => {
        return sendSuccess(response, 'ok', { ok: true });
      }
    );
    app.use(errorHandler);

    const result = await invokeApp(app, { path: '/protected' });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Authentication required');
  });

  it('rejects malformed bearer headers', async () => {
    const app = express();

    app.get(
      '/protected',
      createAuthenticate({
        verifyAccessToken: vi.fn(),
        getProfileByUserId: vi.fn(),
      }),
      (_request, response) => {
        return sendSuccess(response, 'ok', { ok: true });
      }
    );
    app.use(errorHandler);

    const result = await invokeApp(app, {
      path: '/protected',
      headers: { authorization: 'Token abc' },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Authentication required');
  });

  it('rejects invalid tokens', async () => {
    const app = express();

    app.get(
      '/protected',
      createAuthenticate({
        verifyAccessToken: vi.fn().mockRejectedValue(new Error('bad token')),
        getProfileByUserId: vi.fn(),
      }),
      (_request, response) => {
        return sendSuccess(response, 'ok', { ok: true });
      }
    );
    app.use(errorHandler);

    const result = await invokeApp(app, {
      path: '/protected',
      headers: { authorization: 'Bearer bad-token' },
    });

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Invalid or expired access token');
  });
});

describe('authorization middleware', () => {
  it('returns 403 when the authenticated role is not allowed', async () => {
    const app = express();

    app.get(
      '/admin',
      createAuthenticate({
        verifyAccessToken: vi.fn().mockResolvedValue({
          userId: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'supervisor@example.com',
        }),
        getProfileByUserId: vi.fn().mockResolvedValue({
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'supervisor@example.com',
          name: 'Supervisor',
          role: 'SUPERVISOR',
        }),
      }),
      authorize('ADMIN'),
      (_request, response) => {
        return sendSuccess(response, 'ok', { ok: true });
      }
    );
    app.use(errorHandler);

    const result = await invokeApp(app, {
      path: '/admin',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(result.status).toBe(403);
    expect(result.body.message).toBe('Forbidden: insufficient permissions');
  });
});
