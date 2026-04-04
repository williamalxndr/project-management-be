import express from 'express';
import { describe, expect, it } from 'vitest';

import { sendError, sendSuccess } from '../src/shared/http.js';
import { invokeApp } from './support/invoke.js';

describe('response helpers', () => {
  it('returns the standard success envelope', async () => {
    const app = express();

    app.get('/success', (_request, response) => {
      return sendSuccess(response, 'Success message', { ok: true });
    });

    const result = await invokeApp(app, { path: '/success' });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Success message',
      data: { ok: true },
    });
  });

  it('returns the standard error envelope', async () => {
    const app = express();

    app.get('/error', (_request, response) => {
      return sendError(response, 'Error message', { field: 'validation message' }, 400);
    });

    const result = await invokeApp(app, { path: '/error' });

    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      success: false,
      message: 'Error message',
      errors: { field: 'validation message' },
    });
  });
});
