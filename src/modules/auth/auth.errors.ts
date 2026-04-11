import {
  JOSEAlgNotAllowed,
  JWKSNoMatchingKey,
  JWKSTimeout,
  JWSInvalid,
  JWSSignatureVerificationFailed,
  JWTClaimValidationFailed,
  JWTExpired,
  JWTInvalid,
} from 'jose/errors';

import { HttpError } from '../../shared/errors.js';

export const LOCAL_AUTH_UNAVAILABLE_MESSAGE =
  'Authentication is unavailable because Supabase is not configured for local development';

export const AUTH_UNAVAILABLE_ENV_HINT =
  'Set SUPABASE_ENABLED=true and configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY';

export const SUPABASE_AUTH_REQUEST_FAILED_MESSAGE = 'Supabase authentication request failed';
export const INVALID_ACCESS_TOKEN_MESSAGE = 'Invalid or expired access token';

export const LEGACY_PROFILE_ROLE_MESSAGE =
  'Authentication is unavailable because legacy MANAGER profiles must be migrated';

export const LEGACY_PROFILE_ROLE_HINT =
  'Run database/migrations/20260407_replace_manager_with_admin.sql in Supabase SQL Editor to convert MANAGER profiles to ADMIN';

export const getLocalAuthUnavailableError = (): HttpError => {
  return new HttpError(LOCAL_AUTH_UNAVAILABLE_MESSAGE, 503, {
    auth: AUTH_UNAVAILABLE_ENV_HINT,
  });
};

export const getLegacyProfileRoleError = (): HttpError => {
  return new HttpError(LEGACY_PROFILE_ROLE_MESSAGE, 503, {
    role: LEGACY_PROFILE_ROLE_HINT,
  });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }

  return fallback;
};

const isSupabaseAuthUpstreamFailure = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if ('status' in error) {
    const status = (error as { status?: number }).status;

    if (typeof status === 'number' && (status === 0 || status >= 500)) {
      return true;
    }
  }

  if ('name' in error) {
    const name = String((error as { name?: unknown }).name);
    return name === 'AuthRetryableFetchError' || name === 'AuthUnknownError';
  }

  return false;
};

const isInvalidAccessTokenError = (error: unknown): boolean => {
  return (
    error instanceof JWTExpired ||
    error instanceof JWTClaimValidationFailed ||
    error instanceof JWTInvalid ||
    error instanceof JWSInvalid ||
    error instanceof JWSSignatureVerificationFailed ||
    error instanceof JOSEAlgNotAllowed ||
    error instanceof JWKSNoMatchingKey
  );
};

export const mapSupabaseAuthError = (error: unknown, invalidMessage: string): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  if (isSupabaseAuthUpstreamFailure(error)) {
    return new HttpError(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE, 502, {
      auth: getErrorMessage(error, 'Supabase auth returned an unexpected error'),
    });
  }

  return new HttpError(invalidMessage, 401);
};

export const mapAccessTokenVerificationError = (error: unknown): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  if (isInvalidAccessTokenError(error)) {
    return new HttpError(INVALID_ACCESS_TOKEN_MESSAGE, 401);
  }

  if (error instanceof JWKSTimeout) {
    return new HttpError(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE, 502, {
      auth: getErrorMessage(error, 'Timed out while loading Supabase JWKS'),
    });
  }

  return new HttpError(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE, 502, {
    auth: getErrorMessage(error, 'Unable to verify Supabase access token'),
  });
};
