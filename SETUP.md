# Backend Supabase Setup

## 0. Runtime Requirement

Use Node.js 20 or newer. The backend package declares `node >=20`, and linting is expected to run on Node 20 in CI.

## 1. Configure Environment Variables

Copy `.env.example` to `.env` and set:

- `SUPABASE_ENABLED=true`
- `SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<server-side secret or legacy service_role key>`
- `SUPABASE_JWT_AUDIENCE=authenticated`
- `SUPABASE_STORAGE_BUCKET=task-evidence`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend or browser code.

## 2. Run The Schema In Supabase

Open the Supabase SQL Editor and run `../database/schema.sql` from the workspace root.

This creates:

- `profiles`
- `projects`
- `tasks`
- `task_progress`
- `approvals`

## 3. Enable Auth And Storage

In the Supabase dashboard:

- enable the Email auth provider
- create a Storage bucket named `task-evidence`
- create your initial auth users manually

This backend phase assumes users are pre-registered. There is no public register endpoint.

## 4. Insert Matching Application Profiles

For every auth user, insert a matching row into `profiles` with the same `auth.users.id`.

Example:

```sql
insert into public.profiles (id, email, name, role)
values
  ('<auth-user-uuid>', 'admin@example.com', 'Admin User', 'ADMIN'),
  ('<auth-user-uuid>', 'supervisor@example.com', 'Supervisor User', 'SUPERVISOR');
```

The backend treats `profiles.role` as the source of truth for authorization. A valid Supabase token without a matching `profiles` row is rejected with `403`.

If you are upgrading from an older database that still contains `MANAGER` profiles, run `../database/migrations/20260407_replace_manager_with_admin.sql` in Supabase SQL Editor before testing auth. The backend returns `503` until those legacy rows are migrated.

## 5. Verify Locally

From `backend/`:

```bash
npm install
npm run seed:swagger-auth
npm run dev
```

The default seeded Swagger login is:

- email: `admin@example.com`
- password: `Password123!`

Then verify:

- `GET /health` returns `200`
- `GET /ready` returns `200` when Supabase is configured correctly
- `POST /api/v1/auth/login` returns access and refresh tokens for a pre-registered user
- `POST /api/v1/auth/refresh` returns rotated session tokens
- `POST /api/v1/auth/logout` revokes the current refresh token
- `GET /api/v1/auth/me` returns the current user when called with `Authorization: Bearer <login_or_refresh_data.accessToken>`
- `GET /docs` opens Swagger UI for the implemented backend routes

Troubleshooting:

- If `/api/v1/auth/me` returns `401 Invalid or expired access token`, make sure you pasted the full `data.accessToken` from login or refresh.
- Do not use the `refreshToken` in the `Authorization` header.
