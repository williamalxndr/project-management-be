import { getEnv, type Env } from '../config/env.js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from './supabase.js';

import type { ReadinessReport } from '../shared/types.js';

export interface ReadinessService {
  check: () => Promise<ReadinessReport>;
}

export interface ReadinessDependencies {
  env?: Env;
  supabase?: SupabaseClient;
}

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
            database:
              'Set SUPABASE_ENABLED=true and configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable backend integrations',
          },
        };
      }

      const client = supabase ?? getSupabaseAdminClient(env);
      const { error } = await client.from('profiles').select('id', { count: 'exact', head: true });

      if (error) {
        return {
          ok: false,
          message: 'Supabase readiness check failed',
          checks: {
            database: 'error',
            storage: 'placeholder',
          },
          errors: {
            database: error.message,
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
