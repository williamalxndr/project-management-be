import type { Express, Request, Response } from 'express';

import swaggerUi from 'swagger-ui-express';

import type { Env } from '../config/env.js';

const SWAGGER_UI_PATH = '/docs';
const OPENAPI_JSON_PATH = '/docs/openapi.json';

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

export const buildOpenApiDocument = (env: Env) => ({
  openapi: '3.0.3',
  info: {
    title: 'Field Operations Project Management API',
    version: '1.0.0',
    description:
      'Swagger documentation for the routes currently implemented in the Express backend. Project, task, progress, and approval endpoints are scaffolded in code but not exposed yet.',
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
  ],
  components: {
    schemas: {
      ApiError: apiErrorSchema,
      HealthStatus: healthStatusSchema,
      ReadinessReport: readinessReportSchema,
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
