# Backend API Contract

## Standard Response

### Success

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": "validation message"
  }
}
```

## Authentication

Frontend sign-in is handled directly by Supabase Auth.

Protected backend requests must include:

`Authorization: Bearer <supabase_access_token>`

The backend verifies the Supabase access token and resolves the user's application role from the `profiles` table.

### GET /api/v1/auth/me

Returns the authenticated user profile resolved from `profiles`.

Success response:

```json
{
  "success": true,
  "message": "Authenticated user retrieved",
  "data": {
    "id": "fe19d71b-07d6-44d8-ad88-e398f7f7061f",
    "email": "manager@example.com",
    "name": "Manager",
    "role": "MANAGER"
  }
}
```

Failure modes:

- `401` missing, malformed, invalid, or expired bearer token
- `403` valid Supabase token with no matching `profiles` row
- `503` Supabase auth unavailable in local development because backend configuration is missing

## Swagger

When the backend is running, Swagger UI is available at:

- `GET /docs`
- raw OpenAPI JSON: `GET /docs/openapi.json`

The Swagger document currently covers the routes that are actually implemented in the Express app.

## Current Route Baseline

Implemented now:

- `GET /health`
- `GET /ready`
- `GET /api/v1/auth/me`

Planned next:

- project and task creation for authenticated `ADMIN` or `MANAGER` users
- progress submission for authenticated `SUPERVISOR` users
- approvals and rejections for authenticated `MANAGER` users
