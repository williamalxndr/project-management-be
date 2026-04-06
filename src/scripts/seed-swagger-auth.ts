import { getEnv } from '../config/env.js';
import { createSupabaseAdminClient } from '../lib/supabase.js';
import { APP_ROLES, type AppRole } from '../shared/types.js';

const DEFAULT_EMAIL = 'swagger.admin@example.com';
const DEFAULT_PASSWORD = 'Password123!';
const DEFAULT_NAME = 'Swagger Admin';
const DEFAULT_ROLE: AppRole = 'ADMIN';
const LEGACY_DEFAULT_EMAIL = 'swagger.manager@example.com';

const resolveRole = (): AppRole => {
  const rawRole = process.env.SEED_AUTH_ROLE;

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
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string
) => {
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

const main = async (): Promise<void> => {
  const env = getEnv();

  if (!env.supabaseEnabled) {
    throw new Error('Supabase is disabled. Set SUPABASE_ENABLED=true before seeding.');
  }

  const email = (process.env.SEED_AUTH_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.SEED_AUTH_PASSWORD ?? DEFAULT_PASSWORD;
  const name = (process.env.SEED_AUTH_NAME ?? DEFAULT_NAME).trim();
  const role = resolveRole();
  const supabase = createSupabaseAdminClient(env);

  if (email === DEFAULT_EMAIL) {
    const legacyUser = await findUserByEmail(supabase, LEGACY_DEFAULT_EMAIL);

    if (legacyUser) {
      const { error } = await supabase.auth.admin.deleteUser(legacyUser.id);

      if (error) {
        throw new Error(`Unable to remove legacy Swagger manager account: ${error.message}`);
      }
    }
  }

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

  console.log('Seeded Swagger auth account');
  console.log(`email=${email}`);
  console.log(`password=${password}`);
  console.log(`role=${role}`);
  console.log(`userId=${user.id}`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
