# Backend API Contract

## Standard Response

Success:

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

Error:

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

Authentication is backend-owned and backed by Supabase Auth.
Users must exist in Supabase Auth and have a matching row in `profiles`.

### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "admin@example.com",
  "password": "secret-password"
}
```

Returns:
- `accessToken`
- `refreshToken`
- `tokenType`
- `expiresIn`
- `expiresAt`
- resolved `user` profile

Use `data.accessToken` for protected requests.

### `POST /api/v1/auth/refresh`

Request:

```json
{
  "refreshToken": "refresh-token"
}
```

Returns the same session payload shape as login.
After refresh, use the new `data.accessToken`.

### `POST /api/v1/auth/logout`

Request:

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "refresh-token"
}
```

Returns:

```json
{
  "success": true,
  "message": "Authenticated session revoked",
  "data": {
    "signedOut": true
  }
}
```

### `GET /api/v1/auth/me`

Header:

`Authorization: Bearer <accessToken>`

Use the full `data.accessToken` from login or refresh.
Do not use the `refreshToken`.

Returns the authenticated user profile from `profiles`.

Common auth failures:
- `400` invalid login, refresh, or logout body
- `401` invalid credentials, invalid/expired token, or missing/malformed bearer header
- `403` valid Supabase identity with no matching `profiles` row
- `502` Supabase auth or JWKS verification failed upstream
- `503` local auth is disabled or legacy `MANAGER` rows still need migration


## Docs

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/openapi.json`
