import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEnv, type Env } from '../config/env.js';

export const createSupabaseAdminClient = (env: Env = getEnv()): SupabaseClient => {
  if (!env.supabaseEnabled || !env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('Supabase admin client is unavailable because Supabase is disabled');
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

let cachedSupabaseClient: SupabaseClient | undefined;

export const getSupabaseAdminClient = (env: Env = getEnv()): SupabaseClient => {
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createSupabaseAdminClient(env);
  }

  return cachedSupabaseClient;
};

export const resetSupabaseClientForTests = (): void => {
  cachedSupabaseClient = undefined;
};
