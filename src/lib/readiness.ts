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

const getReadinessErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }

  return 'Unknown readiness check failure';
};

const countLegacyManagerProfiles = async (client: SupabaseClient): Promise<number> => {
  const { count, error } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'MANAGER');

  if (error) {
    throw error;
  }

  return count ?? 0;
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
            database: getReadinessErrorMessage(error),
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
