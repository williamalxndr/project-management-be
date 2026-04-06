import type { SupabaseClient } from '@supabase/supabase-js';

import { getEnv, type Env } from '../../config/env.js';
import { getSupabaseAdminClient } from '../../lib/supabase.js';
import { HttpError } from '../../shared/errors.js';

import { isSupabaseAuthConfigured } from './auth.config.js';
import { getLegacyProfileRoleError, getLocalAuthUnavailableError } from './auth.errors.js';
import { profileSchema, rawProfileSchema } from './auth.schema.js';
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

    const rawProfileResult = rawProfileSchema.safeParse(data);

    if (!rawProfileResult.success) {
      throw new HttpError('Unable to load user profile', 500, {
        profile: 'Invalid profile data returned from database',
      });
    }

    if (rawProfileResult.data.role === 'MANAGER') {
      throw getLegacyProfileRoleError();
    }

    const profileResult = profileSchema.safeParse(rawProfileResult.data);

    if (!profileResult.success) {
      throw new HttpError('Unable to load user profile', 500, {
        profile: 'Invalid profile role returned from database',
      });
    }

    return profileResult.data;
  };
};
