import { createRemoteJWKSet, jwtVerify } from 'jose';

import { getEnv, type Env } from '../../config/env.js';
import { HttpError } from '../../shared/errors.js';

import { getVerificationOptions, isSupabaseAuthConfigured } from './auth.config.js';
import {
  INVALID_ACCESS_TOKEN_MESSAGE,
  getLocalAuthUnavailableError,
  mapAccessTokenVerificationError,
} from './auth.errors.js';
import type { VerifyAccessToken } from './auth.types.js';

export const createSupabaseTokenVerifier = (env: Env = getEnv()): VerifyAccessToken => {
  if (!isSupabaseAuthConfigured(env) || !env.supabaseUrl) {
    return async () => {
      throw getLocalAuthUnavailableError();
    };
  }

  const jwks = createRemoteJWKSet(new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`));

  return async (token: string) => {
    try {
      const { payload } = await jwtVerify(token, jwks, getVerificationOptions(env));

      if (!payload.sub) {
        throw new HttpError(INVALID_ACCESS_TOKEN_MESSAGE, 401);
      }

      return {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
      };
    } catch (error) {
      throw mapAccessTokenVerificationError(error);
    }
  };
};
