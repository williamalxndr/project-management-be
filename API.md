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

Authentication is handled through backend-owned auth endpoints backed by Supabase Auth.
Users are pre-registered in Supabase Auth and must also have a matching row in `profiles`.

### POST /api/v1/auth/login

Request body:

```json
{
  "email": "admin@example.com",
  "password": "secret-password"
}
```

Success response:

```json
{
  "success": true,
  "message": "Authenticated session created",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "refresh-token",
    "tokenType": "bearer",
    "expiresIn": 3600,
    "expiresAt": "2026-04-07T16:00:00.000Z",
    "user": {
      "id": "fe19d71b-07d6-44d8-ad88-e398f7f7061f",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "ADMIN"
    }
  }
}
```

Use `data.accessToken` from this response as the bearer token for protected routes such as `/api/v1/auth/me`.

### POST /api/v1/auth/refresh

Request body:

```json
{
  "refreshToken": "refresh-token"
}
```

Returns the same session payload shape as login. After a refresh, use the new `data.accessToken` for subsequent protected requests.

### POST /api/v1/auth/logout

Request body:

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "refresh-token"
}
```

Success response:

```json
{
  "success": true,
  "message": "Authenticated session revoked",
  "data": {
    "signedOut": true
  }
}
```

### GET /api/v1/auth/me

Protected backend requests must include:

`Authorization: Bearer <supabase_access_token>`

Use the `data.accessToken` returned by login or refresh here. Do not send the `refreshToken`.

Returns the authenticated user profile resolved from `profiles`.

Success response:

```json
{
  "success": true,
  "message": "Authenticated user retrieved",
  "data": {
    "id": "fe19d71b-07d6-44d8-ad88-e398f7f7061f",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "ADMIN"
  }
}
```

Failure modes:

- `400` invalid request body for login, refresh, or logout
- `401` invalid credentials, invalid/expired access token, invalid/expired session tokens, or missing/malformed bearer token
- `502` Supabase auth or JWKS verification request failed upstream
- `403` valid Supabase identity with no matching `profiles` row
- `503` Supabase auth unavailable in local development because backend configuration is missing
- `503` legacy `MANAGER` profiles detected and must be migrated to `ADMIN`

### Troubleshooting `/api/v1/auth/me`

If login returns `200` but `/api/v1/auth/me` returns `401 "Invalid or expired access token"`:

- make sure the `Authorization` header uses the full `data.accessToken` from login
- do not send the `refreshToken`
- do not send a shortened or manually copied partial token

## Swagger

When the backend is running, Swagger UI is available at:

- `GET /docs`
- raw OpenAPI JSON: `GET /docs/openapi.json`

The Swagger document currently covers the routes that are actually implemented in the Express app.

## Current Route Baseline

Implemented now:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /health`
- `GET /ready`
- `GET /api/v1/auth/me`

Planned next:

- project and task creation for authenticated `ADMIN` users
- progress submission for authenticated `SUPERVISOR` users
- approvals and rejections for authenticated `ADMIN` users
