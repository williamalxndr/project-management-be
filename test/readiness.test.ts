import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/config/env.js';
import { AUTH_UNAVAILABLE_ENV_HINT, LEGACY_PROFILE_ROLE_HINT, LEGACY_PROFILE_ROLE_MESSAGE } from '../src/modules/auth/auth.errors.js';
import { createReadinessService } from '../src/lib/readiness.js';

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

const createReadinessClient = (result: {
  count: number | null;
  error: { message: string } | null;
}): SupabaseClient =>
  ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(result),
      }),
    }),
  }) as unknown as SupabaseClient;

describe('createReadinessService', () => {
  it('returns degraded readiness when Supabase is disabled locally', async () => {
    const readinessService = createReadinessService({
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

    const report = await readinessService.check();

    expect(report.ok).toBe(false);
    expect(report.message).toBe('Supabase is disabled for local development');
    expect(report.errors).toEqual({
      database: `${AUTH_UNAVAILABLE_ENV_HINT} to enable backend integrations`,
    });
  });

  it('returns degraded readiness when legacy manager profiles remain', async () => {
    const readinessService = createReadinessService({
      env: testEnv,
      supabase: createReadinessClient({
        count: 1,
        error: null,
      }),
    });

    const report = await readinessService.check();

    expect(report.ok).toBe(false);
    expect(report.message).toBe(LEGACY_PROFILE_ROLE_MESSAGE);
    expect(report.errors).toEqual({
      database: `Found 1 legacy MANAGER profile rows. ${LEGACY_PROFILE_ROLE_HINT}`,
    });
  });

  it('returns ready when no legacy manager profiles remain', async () => {
    const readinessService = createReadinessService({
      env: testEnv,
      supabase: createReadinessClient({
        count: 0,
        error: null,
      }),
    });

    const report = await readinessService.check();

    expect(report.ok).toBe(true);
    expect(report.message).toBe('Service ready');
    expect(report.checks.database).toBe('ok');
  });

  it('returns degraded readiness when the readiness query fails', async () => {
    const readinessService = createReadinessService({
      env: testEnv,
      supabase: createReadinessClient({
        count: null,
        error: { message: 'query failed' },
      }),
    });

    const report = await readinessService.check();

    expect(report.ok).toBe(false);
    expect(report.message).toBe('Supabase readiness check failed');
    expect(report.errors).toEqual({
      database: 'query failed',
    });
  });
});
