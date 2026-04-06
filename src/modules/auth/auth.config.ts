import type { Env } from '../../config/env.js';

export const isSupabaseAuthConfigured = (env: Env): boolean => {
  return Boolean(
    env.supabaseEnabled &&
      env.supabaseUrl &&
      env.supabasePublishableKey &&
      env.supabaseServiceRoleKey
  );
};

export const getVerificationOptions = (env: Env) => {
  return {
    issuer: `${env.supabaseUrl}/auth/v1`,
    ...(env.supabaseJwtAudience ? { audience: env.supabaseJwtAudience } : {}),
  };
};
