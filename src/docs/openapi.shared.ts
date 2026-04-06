export type OpenApiSchema = Record<string, unknown>;
export type OpenApiResponse = {
  description: string;
  content: {
    'application/json': {
      schema: OpenApiSchema;
      example?: unknown;
    };
  };
};

export type OpenApiRequestBody = {
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

export const apiErrorSchema: OpenApiSchema = {
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

export const buildSuccessEnvelopeSchema = (dataSchema: OpenApiSchema): OpenApiSchema => ({
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

export const createJsonResponse = (
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

export const createJsonRequestBody = (
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

export const createErrorResponse = (
  description: string,
  message: string,
  errors: Record<string, string> | null = null
): OpenApiResponse =>
  createJsonResponse(description, apiErrorSchema, {
    success: false,
    message,
    errors,
  });
