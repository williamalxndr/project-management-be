import { JWKSTimeout, JWTInvalid } from 'jose/errors';
import { describe, expect, it } from 'vitest';

import {
  INVALID_ACCESS_TOKEN_MESSAGE,
  SUPABASE_AUTH_REQUEST_FAILED_MESSAGE,
  mapAccessTokenVerificationError,
  mapSupabaseAuthError,
} from '../src/modules/auth/auth.errors.js';

describe('mapSupabaseAuthError', () => {
  it('maps retryable upstream failures to 502', () => {
    const error = mapSupabaseAuthError(
      {
        name: 'AuthRetryableFetchError',
        status: 0,
        message: 'fetch failed',
      },
      'Invalid email or password'
    );

    expect(error.statusCode).toBe(502);
    expect(error.message).toBe(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE);
    expect(error.errors).toEqual({
      auth: 'fetch failed',
    });
  });

  it('maps invalid credential failures to 401', () => {
    const error = mapSupabaseAuthError(
      {
        name: 'AuthApiError',
        status: 400,
        message: 'Invalid login credentials',
      },
      'Invalid email or password'
    );

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid email or password');
    expect(error.errors).toBeNull();
  });
});

describe('mapAccessTokenVerificationError', () => {
  it('maps invalid JWT failures to 401', () => {
    const error = mapAccessTokenVerificationError(new JWTInvalid('invalid jwt'));

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe(INVALID_ACCESS_TOKEN_MESSAGE);
    expect(error.errors).toBeNull();
  });

  it('maps JWKS upstream failures to 502', () => {
    const error = mapAccessTokenVerificationError(new JWKSTimeout('jwks timed out'));

    expect(error.statusCode).toBe(502);
    expect(error.message).toBe(SUPABASE_AUTH_REQUEST_FAILED_MESSAGE);
    expect(error.errors).toEqual({
      auth: 'jwks timed out',
    });
  });
});
