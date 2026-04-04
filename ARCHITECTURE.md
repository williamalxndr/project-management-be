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
- Future business routes live under `/api/v1`.
- Frontend handles sign-in with Supabase Auth and sends bearer tokens to Express.
- Express resolves the application role from the `profiles` table and enforces authorization.

## Environment Variables

- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
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

Schema is defined in `/database/schema.sql`. Tables: `users`, `projects`, `tasks`, `task_progress`, `approvals`.

The backend uses the Supabase **service role key** (not the anon key) to bypass Row Level Security. Authorization is handled by Express middleware (`auth.js` + `authorize.js`).
