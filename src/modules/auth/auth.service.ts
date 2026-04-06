export { createAuthDependencies, type CreateAuthDependenciesOptions } from './auth.dependencies.js';
export { AUTH_UNAVAILABLE_ENV_HINT, LOCAL_AUTH_UNAVAILABLE_MESSAGE } from './auth.errors.js';
export { createGetProfileByUserId } from './auth.profile.service.js';
export { createLogoutSession, createRefreshAuthSession, createSignInWithPassword } from './auth.session.service.js';
export { createSupabaseTokenVerifier } from './auth.token.service.js';
export type {
  AuthDependencyOverrides,
  AuthenticatedSessionResponse,
  AuthServiceDependencies,
  AuthSessionPayload,
  GetProfileByUserId,
  LogoutSession,
  LogoutSessionInput,
  RefreshAuthSession,
  SignInWithPassword,
  SignInWithPasswordInput,
  VerifiedAccessToken,
  VerifyAccessToken,
} from './auth.types.js';
