import { describe, expect, it } from 'vitest';

import { parseEnv } from '../src/config/env.js';
import { EnvValidationError } from '../src/shared/errors.js';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  SUPABASE_JWT_AUDIENCE: 'authenticated',
  SUPABASE_STORAGE_BUCKET: 'task-evidence',
  CORS_ORIGIN: 'http://localhost:3000',
  JSON_BODY_LIMIT: '10mb',
  LOG_LEVEL: 'info',
};

describe('parseEnv', () => {
  it('disables Supabase by default in development when credentials are missing', () => {
    const env = parseEnv({
      ...validEnv,
      NODE_ENV: 'development',
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });

    expect(env.supabaseEnabled).toBe(false);
    expect(env.supabaseConfigured).toBe(false);
  });

  it('fails when Supabase is explicitly enabled without credentials', () => {
    try {
      parseEnv({
        ...validEnv,
        NODE_ENV: 'development',
        SUPABASE_ENABLED: 'true',
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      });
      throw new Error('parseEnv did not throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).issues.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    }
  });

  it('fails in production when Supabase credentials are missing', () => {
    try {
      parseEnv({
        ...validEnv,
        NODE_ENV: 'production',
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      });
      throw new Error('parseEnv did not throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).issues.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    }
  });
});
