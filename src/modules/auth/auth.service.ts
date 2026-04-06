import type { AuthSession, SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { getEnv, type Env } from '../../config/env.js';
import { createSupabaseAuthClient, getSupabaseAdminClient } from '../../lib/supabase.js';
import { HttpError } from '../../shared/errors.js';

import { profileSchema, type UserProfile } from './auth.schema.js';

export interface VerifiedAccessToken {
  userId: string;
  email: string | null;
}

export interface AuthSessionPayload {
  userId: string;
  email: string | null;
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  expiresIn: number;
  expiresAt: string;
}

export interface SignInWithPasswordInput {
  email: string;
  password: string;
}

export interface LogoutSessionInput {
  accessToken: string;
  refreshToken: string;
}

export type VerifyAccessToken = (token: string) => Promise<VerifiedAccessToken>;
export type GetProfileByUserId = (userId: string) => Promise<UserProfile>;
export type SignInWithPassword = (
  credentials: SignInWithPasswordInput
) => Promise<AuthSessionPayload>;
export type RefreshAuthSession = (refreshToken: string) => Promise<AuthSessionPayload>;
export type LogoutSession = (tokens: LogoutSessionInput) => Promise<void>;

export interface AuthServiceDependencies {
  verifyAccessToken: VerifyAccessToken;
  getProfileByUserId: GetProfileByUserId;
  signInWithPassword: SignInWithPassword;
  refreshAuthSession: RefreshAuthSession;
  logoutSession: LogoutSession;
}

const LOCAL_AUTH_UNAVAILABLE_MESSAGE =
  'Authentication is unavailable because Supabase is not configured for local development';

const getLocalAuthUnavailableError = (): HttpError => {
  return new HttpError(LOCAL_AUTH_UNAVAILABLE_MESSAGE, 503, {
    auth: 'Set SUPABASE_ENABLED=true and configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY',
  });
};

const isSupabaseAuthConfigured = (env: Env): boolean => {
  return Boolean(
    env.supabaseEnabled &&
      env.supabaseUrl &&
      env.supabasePublishableKey &&
      env.supabaseServiceRoleKey
  );
};

const getVerificationOptions = (env: Env) => {
  return {
    issuer: `${env.supabaseUrl}/auth/v1`,
    ...(env.supabaseJwtAudience ? { audience: env.supabaseJwtAudience } : {}),
  };
};

const mapSupabaseSession = (
  session: AuthSession | null,
  invalidMessage: string
): AuthSessionPayload => {
  if (!session?.access_token || !session.refresh_token || !session.user?.id) {
    throw new HttpError(invalidMessage, 401);
  }

  const expiresIn = session.expires_in ?? 0;
  const expiresAtEpochSeconds =
    session.expires_at ?? Math.floor(Date.now() / 1000) + Math.max(expiresIn, 0);

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenType: 'bearer',
    expiresIn,
    expiresAt: new Date(expiresAtEpochSeconds * 1000).toISOString(),
  };
};

const mapSupabaseAuthError = (error: unknown, invalidMessage: string): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (typeof status === 'number' && status >= 500) {
      return new HttpError('Supabase authentication request failed', 502, {
        auth:
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Supabase auth returned an unexpected error',
      });
    }
  }

  return new HttpError(invalidMessage, 401);
};

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

export const createSignInWithPassword = (env: Env = getEnv()): SignInWithPassword => {
  if (!isSupabaseAuthConfigured(env)) {
    return async () => {
      throw getLocalAuthUnavailableError();
    };
  }

  return async ({ email, password }) => {
    const supabase = createSupabaseAuthClient(env);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw mapSupabaseAuthError(error, 'Invalid email or password');
    }

    return mapSupabaseSession(data.session, 'Invalid email or password');
  };
};

export const createRefreshAuthSession = (env: Env = getEnv()): RefreshAuthSession => {
  if (!isSupabaseAuthConfigured(env)) {
    return async () => {
      throw getLocalAuthUnavailableError();
    };
  }

  return async (refreshToken: string) => {
    const supabase = createSupabaseAuthClient(env);
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw mapSupabaseAuthError(error, 'Invalid or expired refresh token');
    }

    return mapSupabaseSession(data.session, 'Invalid or expired refresh token');
  };
};

export const createLogoutSession = (env: Env = getEnv()): LogoutSession => {
  if (!isSupabaseAuthConfigured(env)) {
    return async () => {
      throw getLocalAuthUnavailableError();
    };
  }

  return async ({ accessToken, refreshToken }) => {
    const supabase = createSupabaseAuthClient(env);
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw mapSupabaseAuthError(error, 'Invalid or expired session tokens');
    }

    mapSupabaseSession(data.session, 'Invalid or expired session tokens');

    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });

    if (signOutError) {
      throw mapSupabaseAuthError(signOutError, 'Invalid or expired session tokens');
    }
  };
};

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

    return profileSchema.parse(data) as UserProfile;
  };
};
