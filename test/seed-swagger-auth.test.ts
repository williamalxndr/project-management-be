import { describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/config/env.js';
import {
  DEFAULT_EMAIL,
  DEFAULT_PASSWORD,
  LEGACY_DEFAULT_EMAILS,
  seedSwaggerAuth,
} from '../src/scripts/seed-swagger-auth.js';

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

describe('seedSwaggerAuth', () => {
  it('uses the canonical admin demo account and removes legacy demo users', async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: {
        users: [
          { id: 'legacy-manager', email: LEGACY_DEFAULT_EMAILS[0] },
          { id: 'legacy-admin', email: LEGACY_DEFAULT_EMAILS[1] },
        ],
      },
      error: null,
    });
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const createUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'new-admin-user',
          email: DEFAULT_EMAIL,
        },
      },
      error: null,
    });
    const updateUserById = vi.fn();
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const logs: string[] = [];

    const result = await seedSwaggerAuth({
      env: testEnv,
      processEnv: {},
      supabase: {
        auth: {
          admin: {
            listUsers,
            updateUserById,
            createUser,
            deleteUser,
          },
        },
        from: vi.fn().mockReturnValue({
          upsert,
        }),
      },
      log: (message) => {
        logs.push(message);
      },
    });

    expect(result).toEqual({
      email: DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
      role: 'ADMIN',
      userId: 'new-admin-user',
    });
    expect(deleteUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenNthCalledWith(1, 'legacy-manager');
    expect(deleteUser).toHaveBeenNthCalledWith(2, 'legacy-admin');
    expect(createUser).toHaveBeenCalledWith({
      email: DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: 'Admin',
      },
    });
    expect(upsert).toHaveBeenCalledWith(
      {
        id: 'new-admin-user',
        email: DEFAULT_EMAIL,
        name: 'Admin',
        role: 'ADMIN',
      },
      {
        onConflict: 'id',
      }
    );
    expect(logs).toContain(`email=${DEFAULT_EMAIL}`);
  });
});
