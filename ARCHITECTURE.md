# Backend Architecture

## Tech Stack

- Runtime: Node.js
- Framework: Express 5
- Language: TypeScript
- Auth: Supabase Auth token verification
- Database: Supabase PostgreSQL
- Storage: Supabase Storage
- Validation: Zod

## Structure

```text
src/
├── app.ts
├── server.ts
├── config/
├── lib/
├── middleware/
├── modules/
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── progress/
│   └── approvals/
├── routes/
└── shared/
```

## Runtime Contract

- `GET /health` reports process health.
- `GET /ready` verifies environment configuration and Supabase reachability.
- `POST /api/v1/auth/login` authenticates a pre-registered user against Supabase Auth.
- `POST /api/v1/auth/refresh` refreshes a backend-managed bearer session.
- `POST /api/v1/auth/logout` revokes the current session refresh token.
- `GET /api/v1/auth/me` returns the authenticated user resolved from `profiles`.
- Future business routes live under `/api/v1`.
- Frontend authenticates through the backend auth endpoints and sends bearer tokens to Express.
- Express resolves the application role from the `profiles` table and enforces authorization.

## Environment Variables

- `NODE_ENV`
- `PORT`
- `SUPABASE_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_AUDIENCE`
- `SUPABASE_STORAGE_BUCKET`
- `CORS_ORIGIN`
- `JSON_BODY_LIMIT`
- `LOG_LEVEL`
  | `npm run dev` | Start with nodemon (auto-reload) |
  | `npm start` | Start in production |
  | `npm run lint` | Run ESLint |
  | `npm run lint:fix` | Run ESLint with auto-fix |
  | `npm run format` | Run Prettier |

---

## Database

Schema is defined in `/database/schema.sql`. Tables: `profiles`, `projects`, `tasks`, `task_progress`, `approvals`.

The backend uses the Supabase **publishable key** for password login and session refresh, and the **service role key** for privileged profile lookups. Authentication is handled by backend auth endpoints plus bearer token verification, and authorization is handled by Express middleware (`authenticate.ts` + `authorize.ts`).
