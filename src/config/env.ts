import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

import { z } from 'zod';

import { EnvValidationError } from '../shared/errors.js';

loadDotenv({ path: resolve(process.cwd(), '.env') });

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SUPABASE_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_JWT_AUDIENCE: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('task-evidence'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JSON_BODY_LIMIT: z.string().default('10mb'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

type ParsedRawEnv = z.infer<typeof rawEnvSchema>;

export interface Env {
  nodeEnv: ParsedRawEnv['NODE_ENV'];
  port: number;
  supabaseEnabled: boolean;
  supabaseConfigured: boolean;
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
  supabaseServiceRoleKey: string | null;
  supabaseJwtAudience?: string;
  supabaseStorageBucket: string;
  corsOrigin: string;
  jsonBodyLimit: string;
  logLevel: ParsedRawEnv['LOG_LEVEL'];
}

const flattenFieldErrors = (
  fieldErrors: Record<string, string[] | undefined>
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([key, value]) => {
      const message = value?.[0];
      return message ? [[key, message]] : [];
    })
  );
};

export const parseEnv = (rawEnv: NodeJS.ProcessEnv): Env => {
  const parsed = rawEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new EnvValidationError(flattenFieldErrors(parsed.error.flatten().fieldErrors));
  }

  const supabaseConfigured = Boolean(
    parsed.data.SUPABASE_URL &&
      parsed.data.SUPABASE_PUBLISHABLE_KEY &&
      parsed.data.SUPABASE_SERVICE_ROLE_KEY
  );
  const supabaseEnabled =
    parsed.data.SUPABASE_ENABLED ??
    (parsed.data.NODE_ENV === 'production' ? true : supabaseConfigured);

  if (supabaseEnabled && !supabaseConfigured) {
    const issues: Record<string, string> = {};

    if (!parsed.data.SUPABASE_URL) {
      issues.SUPABASE_URL = 'SUPABASE_URL is required when Supabase is enabled';
    }

    if (!parsed.data.SUPABASE_PUBLISHABLE_KEY) {
      issues.SUPABASE_PUBLISHABLE_KEY =
        'SUPABASE_PUBLISHABLE_KEY is required when Supabase is enabled';
    }

    if (!parsed.data.SUPABASE_SERVICE_ROLE_KEY) {
      issues.SUPABASE_SERVICE_ROLE_KEY =
        'SUPABASE_SERVICE_ROLE_KEY is required when Supabase is enabled';
    }

    throw new EnvValidationError(issues);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    supabaseEnabled,
    supabaseConfigured,
    supabaseUrl: parsed.data.SUPABASE_URL ?? null,
    supabasePublishableKey: parsed.data.SUPABASE_PUBLISHABLE_KEY ?? null,
    supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY ?? null,
    supabaseJwtAudience: parsed.data.SUPABASE_JWT_AUDIENCE,
    supabaseStorageBucket: parsed.data.SUPABASE_STORAGE_BUCKET,
    corsOrigin: parsed.data.CORS_ORIGIN,
    jsonBodyLimit: parsed.data.JSON_BODY_LIMIT,
    logLevel: parsed.data.LOG_LEVEL,
  };
};

let cachedEnv: Env | undefined;

export const getEnv = (): Env => {
  if (!cachedEnv) {
    cachedEnv = parseEnv(process.env);
  }

  return cachedEnv;
};

export const resetEnvForTests = (): void => {
  cachedEnv = undefined;
};
