import type { AuthSession } from '@supabase/supabase-js';

import { getEnv, type Env } from '../../config/env.js';
import { createSupabaseAuthClient } from '../../lib/supabase.js';
import { HttpError } from '../../shared/errors.js';

import { isSupabaseAuthConfigured } from './auth.config.js';
import { getLocalAuthUnavailableError, mapSupabaseAuthError } from './auth.errors.js';
import type {
  AuthSessionPayload,
  LogoutSession,
  RefreshAuthSession,
  SignInWithPassword,
} from './auth.types.js';

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
