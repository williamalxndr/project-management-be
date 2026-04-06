import { APP_ROLES } from '../../shared/types.js';
import {
  buildSuccessEnvelopeSchema,
  createErrorResponse,
  createJsonRequestBody,
  createJsonResponse,
  type OpenApiSchema,
} from '../../docs/openapi.shared.js';

import { AUTH_UNAVAILABLE_ENV_HINT, LOCAL_AUTH_UNAVAILABLE_MESSAGE } from './auth.errors.js';

export interface AuthOpenApiSection {
  tags: Array<{
    name: string;
    description: string;
  }>;
  schemas: Record<string, OpenApiSchema>;
  paths: Record<string, Record<string, unknown>>;
}

const authenticatedUserSchema: OpenApiSchema = {
  type: 'object',
  required: ['id', 'email', 'name', 'role'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    email: {
      type: 'string',
      format: 'email',
      nullable: true,
    },
    name: {
      type: 'string',
      nullable: true,
    },
    role: {
      type: 'string',
      enum: [...APP_ROLES],
    },
  },
};

const authSessionPayloadSchema: OpenApiSchema = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn', 'expiresAt', 'user'],
  properties: {
    accessToken: {
      type: 'string',
    },
    refreshToken: {
      type: 'string',
    },
    tokenType: {
      type: 'string',
      enum: ['bearer'],
    },
    expiresIn: {
      type: 'integer',
      minimum: 1,
    },
    expiresAt: {
      type: 'string',
      format: 'date-time',
    },
    user: authenticatedUserSchema,
  },
};

const logoutPayloadSchema: OpenApiSchema = {
  type: 'object',
  required: ['signedOut'],
  properties: {
    signedOut: {
      type: 'boolean',
      enum: [true],
    },
  },
};

const loginRequestSchema: OpenApiSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 1,
    },
  },
};

const refreshRequestSchema: OpenApiSchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: {
      type: 'string',
      minLength: 1,
    },
  },
};

const logoutRequestSchema: OpenApiSchema = {
  type: 'object',
  required: ['accessToken', 'refreshToken'],
  properties: {
    accessToken: {
      type: 'string',
      minLength: 1,
    },
    refreshToken: {
      type: 'string',
      minLength: 1,
    },
  },
};

const sessionExample = {
  accessToken: 'eyJhbGciOi...',
  refreshToken: 'refresh-token',
  tokenType: 'bearer',
  expiresIn: 3600,
  expiresAt: '2026-04-07T16:00:00.000Z',
  user: {
    id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'ADMIN',
  },
};

const createAuthUnavailableResponse = () => {
  return createErrorResponse(
    'Authentication unavailable',
    LOCAL_AUTH_UNAVAILABLE_MESSAGE,
    {
      auth: AUTH_UNAVAILABLE_ENV_HINT,
    }
  );
};

export const buildAuthOpenApiSection = (): AuthOpenApiSection => ({
  tags: [
    {
      name: 'Auth',
      description: 'Backend-owned authentication endpoints backed by Supabase Auth.',
    },
  ],
  schemas: {
    AuthenticatedUser: authenticatedUserSchema,
    AuthSessionPayload: authSessionPayloadSchema,
    LoginRequest: loginRequestSchema,
    LogoutPayload: logoutPayloadSchema,
    LogoutRequest: logoutRequestSchema,
    RefreshRequest: refreshRequestSchema,
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        description:
          'Authenticates a pre-registered user through Supabase Auth, then resolves the matching application profile from the profiles table.',
        requestBody: createJsonRequestBody(loginRequestSchema, {
          email: 'admin@example.com',
          password: 'secret-password',
        }),
        responses: {
          200: createJsonResponse(
            'Authenticated session created',
            buildSuccessEnvelopeSchema(authSessionPayloadSchema),
            {
              success: true,
              message: 'Authenticated session created',
              data: sessionExample,
            }
          ),
          400: createErrorResponse('Validation failed', 'Validation failed', {
            email: 'Invalid email address',
          }),
          401: createErrorResponse('Invalid credentials', 'Invalid email or password'),
          403: createErrorResponse('User profile not found', 'User profile not found'),
          503: createAuthUnavailableResponse(),
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh an authenticated session',
        description:
          'Rotates the provided refresh token through Supabase Auth and returns a new backend auth payload with the resolved application profile.',
        requestBody: createJsonRequestBody(refreshRequestSchema, {
          refreshToken: 'refresh-token',
        }),
        responses: {
          200: createJsonResponse(
            'Authenticated session refreshed',
            buildSuccessEnvelopeSchema(authSessionPayloadSchema),
            {
              success: true,
              message: 'Authenticated session refreshed',
              data: {
                ...sessionExample,
                accessToken: 'eyJhbGciOi...refreshed',
                refreshToken: 'refresh-token-rotated',
                expiresAt: '2026-04-07T17:00:00.000Z',
              },
            }
          ),
          400: createErrorResponse('Validation failed', 'Validation failed', {
            refreshToken: 'Too small: expected string to have >=1 characters',
          }),
          401: createErrorResponse(
            'Invalid refresh token',
            'Invalid or expired refresh token'
          ),
          403: createErrorResponse('User profile not found', 'User profile not found'),
          503: createAuthUnavailableResponse(),
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout the current session',
        description:
          'Revokes the current refresh token through Supabase Auth. The access token remains valid until it expires naturally.',
        requestBody: createJsonRequestBody(logoutRequestSchema, {
          accessToken: 'eyJhbGciOi...',
          refreshToken: 'refresh-token',
        }),
        responses: {
          200: createJsonResponse(
            'Authenticated session revoked',
            buildSuccessEnvelopeSchema(logoutPayloadSchema),
            {
              success: true,
              message: 'Authenticated session revoked',
              data: {
                signedOut: true,
              },
            }
          ),
          400: createErrorResponse('Validation failed', 'Validation failed', {
            accessToken: 'Too small: expected string to have >=1 characters',
          }),
          401: createErrorResponse(
            'Invalid session tokens',
            'Invalid or expired session tokens'
          ),
          503: createAuthUnavailableResponse(),
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user profile',
        description:
          'Validates the supplied Supabase access token and returns the matching application profile from the profiles table.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: createJsonResponse(
            'Authenticated user retrieved',
            buildSuccessEnvelopeSchema(authenticatedUserSchema),
            {
              success: true,
              message: 'Authenticated user retrieved',
              data: sessionExample.user,
            }
          ),
          401: createErrorResponse('Authentication required', 'Authentication required'),
          403: createErrorResponse('User profile not found', 'User profile not found'),
          503: createAuthUnavailableResponse(),
        },
      },
    },
  },
});
