import type { SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { getEnv, type Env } from '../../config/env.js';
import { getSupabaseAdminClient } from '../../lib/supabase.js';
import { HttpError } from '../../shared/errors.js';

import { profileSchema, type UserProfile } from './auth.schema.js';

export interface VerifiedAccessToken {
  userId: string;
  email: string | null;
}

export type VerifyAccessToken = (token: string) => Promise<VerifiedAccessToken>;
export type GetProfileByUserId = (userId: string) => Promise<UserProfile>;

const LOCAL_AUTH_UNAVAILABLE_MESSAGE =
  'Authentication is unavailable because Supabase is not configured for local development';

const getLocalAuthUnavailableError = (): HttpError => {
  return new HttpError(LOCAL_AUTH_UNAVAILABLE_MESSAGE, 503, {
    auth: 'Set SUPABASE_ENABLED=true and configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
  });
};

const getVerificationOptions = (env: Env) => {
  return {
    issuer: `${env.supabaseUrl}/auth/v1`,
    ...(env.supabaseJwtAudience ? { audience: env.supabaseJwtAudience } : {}),
  };
};

export const createSupabaseTokenVerifier = (env: Env = getEnv()): VerifyAccessToken => {
  if (!env.supabaseEnabled || !env.supabaseUrl) {
    return async () => {
      throw getLocalAuthUnavailableError();
    };
  }

  const jwks = createRemoteJWKSet(new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`));

  return async (token: string) => {
    try {
      const { payload } = await jwtVerify(token, jwks, getVerificationOptions(env));

      if (!payload.sub) {
        throw new HttpError('Invalid or expired access token', 401);
      }

      return {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError('Invalid or expired access token', 401);
    }
  };
};

export const createGetProfileByUserId = (
  supabase?: SupabaseClient,
  env: Env = getEnv()
): GetProfileByUserId => {
  if (!supabase) {
    if (!env.supabaseEnabled) {
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

    return profileSchema.parse(data) as UserProfile;
  };
};
