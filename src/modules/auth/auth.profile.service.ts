import type { SupabaseClient } from '@supabase/supabase-js';

import { getEnv, type Env } from '../../config/env.js';
import { getSupabaseAdminClient } from '../../lib/supabase.js';
import { HttpError } from '../../shared/errors.js';

import { isSupabaseAuthConfigured } from './auth.config.js';
import { getLocalAuthUnavailableError } from './auth.errors.js';
import { profileSchema } from './auth.schema.js';
import type { GetProfileByUserId } from './auth.types.js';

export const createGetProfileByUserId = (
  supabase?: SupabaseClient,
  env: Env = getEnv()
): GetProfileByUserId => {
  if (!supabase) {
    if (!isSupabaseAuthConfigured(env)) {
      return async () => {
        throw getLocalAuthUnavailableError();
      };
    }

    supabase = getSupabaseAdminClient(env);
  }

  return async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new HttpError('Unable to load user profile', 500, { database: error.message });
    }

    if (!data) {
      throw new HttpError('User profile not found', 403);
    }

    return profileSchema.parse(data);
  };
};
