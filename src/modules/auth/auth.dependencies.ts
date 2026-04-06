import { getEnv, type Env } from '../../config/env.js';

import { createGetProfileByUserId } from './auth.profile.service.js';
import { createLogoutSession, createRefreshAuthSession, createSignInWithPassword } from './auth.session.service.js';
import { createSupabaseTokenVerifier } from './auth.token.service.js';
import type { AuthDependencyOverrides, AuthServiceDependencies } from './auth.types.js';

export interface CreateAuthDependenciesOptions {
  env?: Env;
  overrides?: AuthDependencyOverrides;
}

export const createAuthDependencies = ({
  env = getEnv(),
  overrides = {},
}: CreateAuthDependenciesOptions = {}): AuthServiceDependencies => {
  return {
    verifyAccessToken: overrides.verifyAccessToken ?? createSupabaseTokenVerifier(env),
    getProfileByUserId: overrides.getProfileByUserId ?? createGetProfileByUserId(undefined, env),
    signInWithPassword: overrides.signInWithPassword ?? createSignInWithPassword(env),
    refreshAuthSession: overrides.refreshAuthSession ?? createRefreshAuthSession(env),
    logoutSession: overrides.logoutSession ?? createLogoutSession(env),
  };
};
