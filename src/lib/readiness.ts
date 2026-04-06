import { getEnv, type Env } from '../config/env.js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { AUTH_UNAVAILABLE_ENV_HINT, LEGACY_PROFILE_ROLE_HINT, LEGACY_PROFILE_ROLE_MESSAGE } from '../modules/auth/auth.errors.js';
import { getSupabaseAdminClient } from './supabase.js';

import type { ReadinessReport } from '../shared/types.js';

export interface ReadinessService {
  check: () => Promise<ReadinessReport>;
}

export interface ReadinessDependencies {
  env?: Env;
  supabase?: SupabaseClient;
}

const LEGACY_ROLE_SCAN_PAGE_SIZE = 1000;

const countLegacyManagerProfiles = async (client: SupabaseClient): Promise<number> => {
  let from = 0;
  let legacyCount = 0;

  while (true) {
    const { data, error } = await client
      .from('profiles')
      .select('role')
      .range(from, from + LEGACY_ROLE_SCAN_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    legacyCount += rows.filter((row) => row.role === 'MANAGER').length;

    if (rows.length < LEGACY_ROLE_SCAN_PAGE_SIZE) {
      return legacyCount;
    }

    from += LEGACY_ROLE_SCAN_PAGE_SIZE;
  }
};

export const createReadinessService = ({
  env = getEnv(),
  supabase,
}: ReadinessDependencies = {}): ReadinessService => {
  return {
    async check() {
      if (!env.supabaseEnabled) {
        return {
          ok: false,
          message: 'Supabase is disabled for local development',
          checks: {
            database: 'disabled',
            storage: 'disabled',
          },
          errors: {
            database: `${AUTH_UNAVAILABLE_ENV_HINT} to enable backend integrations`,
          },
        };
      }

      const client = supabase ?? getSupabaseAdminClient(env);
      try {
        const legacyCount = await countLegacyManagerProfiles(client);

        if (legacyCount > 0) {
          return {
            ok: false,
            message: LEGACY_PROFILE_ROLE_MESSAGE,
            checks: {
              database: 'error',
              storage: 'placeholder',
            },
            errors: {
              database: `Found ${legacyCount} legacy MANAGER profile rows. ${LEGACY_PROFILE_ROLE_HINT}`,
            },
          };
        }
      } catch (error) {
        return {
          ok: false,
          message: 'Supabase readiness check failed',
          checks: {
            database: 'error',
            storage: 'placeholder',
          },
          errors: {
            database:
              error instanceof Error ? error.message : 'Unknown readiness check failure',
          },
        };
      }

      return {
        ok: true,
        message: 'Service ready',
        checks: {
          database: 'ok',
          storage: 'placeholder',
        },
      };
    },
  };
};
