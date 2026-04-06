import { describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/config/env.js';
import { LEGACY_PROFILE_ROLE_HINT, LEGACY_PROFILE_ROLE_MESSAGE } from '../src/modules/auth/auth.errors.js';
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

const createReadinessClient = (pages: Array<{ data: Array<{ role: string }>; error: { message: string } | null }>) => {
  const range = vi.fn();

  for (const page of pages) {
    range.mockResolvedValueOnce(page);
  }

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        range,
      }),
    }),
  } as any;
};

describe('createReadinessService', () => {
  it('returns degraded readiness when legacy manager profiles remain', async () => {
    const readinessService = createReadinessService({
      env: testEnv,
      supabase: createReadinessClient([
        {
          data: [{ role: 'ADMIN' }, { role: 'MANAGER' }, { role: 'SUPERVISOR' }],
          error: null,
        },
      ]),
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
      supabase: createReadinessClient([
        {
          data: [{ role: 'ADMIN' }, { role: 'SUPERVISOR' }],
          error: null,
        },
      ]),
    });

    const report = await readinessService.check();

    expect(report.ok).toBe(true);
    expect(report.message).toBe('Service ready');
    expect(report.checks.database).toBe('ok');
  });
});
