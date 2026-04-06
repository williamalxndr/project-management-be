import type { Express, Request, Response } from 'express';

import swaggerUi from 'swagger-ui-express';

import type { Env } from '../config/env.js';
import { APP_ROLES } from '../shared/types.js';

const SWAGGER_UI_PATH = '/docs';
const OPENAPI_JSON_PATH = '/docs/openapi.json';
const AUTH_UNAVAILABLE_HINT =
  'Set SUPABASE_ENABLED=true and configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY';

type OpenApiSchema = Record<string, unknown>;
type OpenApiResponse = {
  description: string;
  content: {
    'application/json': {
      schema: OpenApiSchema;
      example?: unknown;
    };
  };
};
type OpenApiRequestBody = {
  required: boolean;
  content: {
    'application/json': {
      schema: OpenApiSchema;
      example?: unknown;
    };
  };
};

const nullableStringMapSchema: OpenApiSchema = {
  type: 'object',
  additionalProperties: {
    type: 'string',
  },
  nullable: true,
};

const apiErrorSchema: OpenApiSchema = {
  type: 'object',
  required: ['success', 'message', 'errors'],
  properties: {
    success: {
      type: 'boolean',
      enum: [false],
    },
    message: {
      type: 'string',
    },
    errors: nullableStringMapSchema,
  },
};

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

const healthStatusSchema: OpenApiSchema = {
  type: 'object',
  required: ['status', 'environment', 'supabaseEnabled'],
  properties: {
    status: {
      type: 'string',
      enum: ['ok'],
    },
    environment: {
      type: 'string',
      enum: ['development', 'test', 'production'],
    },
    supabaseEnabled: {
      type: 'boolean',
    },
  },
};

const readinessReportSchema: OpenApiSchema = {
  type: 'object',
  required: ['ok', 'message', 'checks'],
  properties: {
    ok: {
      type: 'boolean',
    },
    message: {
      type: 'string',
    },
    checks: {
      type: 'object',
      required: ['database', 'storage'],
      properties: {
        database: {
          type: 'string',
          enum: ['ok', 'error', 'disabled'],
        },
        storage: {
          type: 'string',
          enum: ['placeholder', 'disabled'],
        },
      },
    },
    errors: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  },
};

const buildSuccessEnvelopeSchema = (dataSchema: OpenApiSchema): OpenApiSchema => ({
  type: 'object',
  required: ['success', 'message', 'data'],
  properties: {
    success: {
      type: 'boolean',
      enum: [true],
    },
    message: {
      type: 'string',
    },
    data: dataSchema,
  },
});

const createJsonResponse = (
  description: string,
  schema: OpenApiSchema,
  example?: unknown
): OpenApiResponse => ({
  description,
  content: {
    'application/json': {
      schema,
      ...(example === undefined ? {} : { example }),
    },
  },
});

const createJsonRequestBody = (
  schema: OpenApiSchema,
  example?: unknown,
  required = true
): OpenApiRequestBody => ({
  required,
  content: {
    'application/json': {
      schema,
      ...(example === undefined ? {} : { example }),
    },
  },
});

const createErrorResponse = (
  description: string,
  message: string,
  errors: Record<string, string> | null = null
): OpenApiResponse =>
  createJsonResponse(description, apiErrorSchema, {
    success: false,
    message,
    errors,
  });

const sessionExample = {
  accessToken: 'eyJhbGciOi...',
  refreshToken: 'refresh-token',
  tokenType: 'bearer',
  expiresIn: 3600,
  expiresAt: '2026-04-07T16:00:00.000Z',
  user: {
    id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
    email: 'manager@example.com',
    name: 'Manager',
    role: 'MANAGER',
  },
};

export const buildOpenApiDocument = (env: Env) => ({
  openapi: '3.0.3',
  info: {
    title: 'Field Operations Project Management API',
    version: '1.0.0',
    description:
      'Swagger documentation for the routes currently implemented in the Express backend. Authentication is handled through backend-owned login, refresh, logout, and profile endpoints backed by Supabase Auth.',
  },
  servers: [
    {
      url: '/',
      description: `Current ${env.nodeEnv} server`,
    },
  ],
  tags: [
    {
      name: 'System',
      description: 'Operational health and readiness endpoints.',
    },
    {
      name: 'Auth',
      description: 'Backend-owned authentication endpoints backed by Supabase Auth.',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase-issued access token passed as a Bearer token.',
      },
    },
    schemas: {
      ApiError: apiErrorSchema,
      AuthenticatedUser: authenticatedUserSchema,
      AuthSessionPayload: authSessionPayloadSchema,
      HealthStatus: healthStatusSchema,
      LoginRequest: loginRequestSchema,
      LogoutPayload: logoutPayloadSchema,
      LogoutRequest: logoutRequestSchema,
      ReadinessReport: readinessReportSchema,
      RefreshRequest: refreshRequestSchema,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Confirms the process is running and the API is reachable.',
        responses: {
          200: createJsonResponse(
            'Service healthy',
            buildSuccessEnvelopeSchema(healthStatusSchema),
            {
              success: true,
              message: 'Service healthy',
              data: {
                status: 'ok',
                environment: env.nodeEnv,
                supabaseEnabled: env.supabaseEnabled,
              },
            }
          ),
        },
      },
    },
    '/ready': {
      get: {
        tags: ['System'],
        summary: 'Readiness check',
        description:
          'Reports whether the backend is ready to serve authenticated traffic and reach its dependencies.',
        responses: {
          200: createJsonResponse(
            'Service ready',
            buildSuccessEnvelopeSchema(readinessReportSchema),
            {
              success: true,
              message: 'Service ready',
              data: {
                ok: true,
                message: 'Service ready',
                checks: {
                  database: 'ok',
                  storage: 'placeholder',
                },
              },
            }
          ),
          503: createErrorResponse('Service not ready', 'Supabase readiness check failed', {
            database: 'connection failed',
          }),
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        description:
          'Authenticates a pre-registered user through Supabase Auth, then resolves the matching application profile from the profiles table.',
        requestBody: createJsonRequestBody(loginRequestSchema, {
          email: 'manager@example.com',
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
          503: createErrorResponse(
            'Authentication unavailable',
            'Authentication is unavailable because Supabase is not configured for local development',
            {
              auth: AUTH_UNAVAILABLE_HINT,
            }
          ),
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
          503: createErrorResponse(
            'Authentication unavailable',
            'Authentication is unavailable because Supabase is not configured for local development',
            {
              auth: AUTH_UNAVAILABLE_HINT,
            }
          ),
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
          503: createErrorResponse(
            'Authentication unavailable',
            'Authentication is unavailable because Supabase is not configured for local development',
            {
              auth: AUTH_UNAVAILABLE_HINT,
            }
          ),
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
          503: createErrorResponse(
            'Authentication unavailable',
            'Authentication is unavailable because Supabase is not configured for local development',
            {
              auth: AUTH_UNAVAILABLE_HINT,
            }
          ),
        },
      },
    },
  },
});

export const registerSwagger = (app: Express, env: Env): void => {
  const openApiDocument = buildOpenApiDocument(env);

  app.get(OPENAPI_JSON_PATH, (_request: Request, response: Response) => {
    response.json(openApiDocument);
  });

  app.use(
    SWAGGER_UI_PATH,
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      explorer: true,
      customSiteTitle: `${openApiDocument.info.title} Docs`,
    })
  );
};
