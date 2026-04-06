import type { Express, Request, Response } from 'express';

import swaggerUi from 'swagger-ui-express';

import type { Env } from '../config/env.js';
import { buildAuthOpenApiSection } from '../modules/auth/auth.openapi.js';
import {
  apiErrorSchema,
  buildSuccessEnvelopeSchema,
  createErrorResponse,
  createJsonResponse,
  type OpenApiSchema,
} from './openapi.shared.js';

const SWAGGER_UI_PATH = '/docs';
const OPENAPI_JSON_PATH = '/docs/openapi.json';

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

export const buildOpenApiDocument = (env: Env) => {
  const authOpenApi = buildAuthOpenApiSection();

  return {
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
      ...authOpenApi.tags,
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
        HealthStatus: healthStatusSchema,
        ReadinessReport: readinessReportSchema,
        ...authOpenApi.schemas,
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
      ...authOpenApi.paths,
    },
  };
};

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
