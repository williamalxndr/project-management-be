import { pathToFileURL } from 'node:url';

import type { Env } from '../config/env.js';
import { getEnv } from '../config/env.js';
import { createSupabaseAdminClient } from '../lib/supabase.js';
import { APP_ROLES, type AppRole } from '../shared/types.js';

export const DEFAULT_EMAIL = 'admin@example.com';
export const DEFAULT_PASSWORD = 'Password123!';
export const DEFAULT_NAME = 'Admin';
export const DEFAULT_ROLE: AppRole = 'ADMIN';
export const LEGACY_DEFAULT_EMAILS = ['swagger.manager@example.com', 'swagger.admin@example.com'];

type SeedAuthUser = {
  id: string;
  email?: string | null;
};

type SeedAdminApi = {
  listUsers: (options: { page: number; perPage: number }) => Promise<{
    data: { users: SeedAuthUser[] };
    error: { message: string } | null;
  }>;
  updateUserById: (
    id: string,
    payload: {
      email: string;
      password: string;
      email_confirm: boolean;
      user_metadata: { name: string };
    }
  ) => Promise<{
    data: { user: SeedAuthUser | null };
    error: { message: string } | null;
  }>;
  createUser: (payload: {
    email: string;
    password: string;
    email_confirm: boolean;
    user_metadata: { name: string };
  }) => Promise<{
    data: { user: SeedAuthUser | null };
    error: { message: string } | null;
  }>;
  deleteUser: (id: string) => Promise<{
    error: { message: string } | null;
  }>;
};

type SeedProfilesApi = {
  upsert: (
    values: {
      id: string;
      email: string;
      name: string;
      role: AppRole;
    },
    options: { onConflict: string }
  ) => Promise<{
    error: { message: string } | null;
  }>;
};

export interface SeedSwaggerAuthClient {
  auth: {
    admin: SeedAdminApi;
  };
  from: (table: 'profiles') => SeedProfilesApi;
}

export interface SeedSwaggerAuthDependencies {
  env?: Env;
  processEnv?: NodeJS.ProcessEnv;
  supabase?: SeedSwaggerAuthClient;
  log?: (message: string) => void;
}

export interface SeedSwaggerAuthResult {
  email: string;
  password: string;
  role: AppRole;
  userId: string;
}

export const resolveRole = (processEnv: NodeJS.ProcessEnv = process.env): AppRole => {
  const rawRole = processEnv.SEED_AUTH_ROLE;

  if (!rawRole) {
    return DEFAULT_ROLE;
  }

  if ((APP_ROLES as readonly string[]).includes(rawRole)) {
    return rawRole as AppRole;
  }

  throw new Error(
    `Invalid SEED_AUTH_ROLE "${rawRole}". Expected one of: ${APP_ROLES.join(', ')}`
  );
};

const findUserByEmail = async (
  supabase: SeedSwaggerAuthClient,
  email: string
): Promise<SeedAuthUser | null> => {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Unable to list Supabase auth users: ${error.message}`);
    }

    const existingUser = data.users.find((user) => user.email?.toLowerCase() === email);

    if (existingUser) {
      return existingUser;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
};

const removeLegacyDefaultUsers = async (
  supabase: SeedSwaggerAuthClient,
  email: string
): Promise<void> => {
  if (email !== DEFAULT_EMAIL) {
    return;
  }

  for (const legacyEmail of LEGACY_DEFAULT_EMAILS) {
    const legacyUser = await findUserByEmail(supabase, legacyEmail);

    if (!legacyUser) {
      continue;
    }

    const { error } = await supabase.auth.admin.deleteUser(legacyUser.id);

    if (error) {
      throw new Error(`Unable to remove legacy Swagger demo account: ${error.message}`);
    }
  }
};

export const seedSwaggerAuth = async ({
  env = getEnv(),
  processEnv = process.env,
  supabase = createSupabaseAdminClient(env) as unknown as SeedSwaggerAuthClient,
  log = console.log,
}: SeedSwaggerAuthDependencies = {}): Promise<SeedSwaggerAuthResult> => {
  if (!env.supabaseEnabled) {
    throw new Error('Supabase is disabled. Set SUPABASE_ENABLED=true before seeding.');
  }

  const email = (processEnv.SEED_AUTH_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
  const password = processEnv.SEED_AUTH_PASSWORD ?? DEFAULT_PASSWORD;
  const name = (processEnv.SEED_AUTH_NAME ?? DEFAULT_NAME).trim();
  const role = resolveRole(processEnv);

  await removeLegacyDefaultUsers(supabase, email);

  let user = await findUserByEmail(supabase, email);

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (error) {
      throw new Error(`Unable to update Supabase auth user: ${error.message}`);
    }

    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (error) {
      throw new Error(`Unable to create Supabase auth user: ${error.message}`);
    }

    user = data.user;
  }

  if (!user?.id) {
    throw new Error('Supabase did not return a user id for the seeded account.');
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email,
      name,
      role,
    },
    {
      onConflict: 'id',
    }
  );

  if (profileError) {
    throw new Error(`Unable to upsert profile row: ${profileError.message}`);
  }

  log('Seeded Swagger auth account');
  log(`email=${email}`);
  log(`password=${password}`);
  log(`role=${role}`);
  log(`userId=${user.id}`);

  return {
    email,
    password,
    role,
    userId: user.id,
  };
};

export const main = async (): Promise<void> => {
  await seedSwaggerAuth();
};

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
