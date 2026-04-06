import { HttpError } from '../../shared/errors.js';

export const LOCAL_AUTH_UNAVAILABLE_MESSAGE =
  'Authentication is unavailable because Supabase is not configured for local development';

export const AUTH_UNAVAILABLE_ENV_HINT =
  'Set SUPABASE_ENABLED=true and configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY';

export const getLocalAuthUnavailableError = (): HttpError => {
  return new HttpError(LOCAL_AUTH_UNAVAILABLE_MESSAGE, 503, {
    auth: AUTH_UNAVAILABLE_ENV_HINT,
  });
};

export const mapSupabaseAuthError = (error: unknown, invalidMessage: string): HttpError => {
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
