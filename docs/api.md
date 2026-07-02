# TaskBoard API Conventions

## Route Style

- Fastify routes live under `apps/api/src/http/routes/`.
- Protected routes use `authenticateRequest`.
- Request params/body/query are validated with Zod and `.safeParse()`.
- Handlers call services or repositories; they should not contain heavy business logic.
- Responses should use stable DTOs.

## Status Codes

- `200`: successful read/update.
- `201`: created resource.
- `204`: successful delete/no response body.
- `400`: invalid input.
- `401`: missing/invalid authentication.
- `403`: authenticated but missing permission.
- `404`: resource not found or not visible in current scope.
- `409`: conflict or duplicated state.

## Error Mapping

Use existing domain errors and mapping helpers when available. Avoid returning raw internal error messages.

Common mapping:

```text
ValidationError -> 400
Unauthenticated -> 401
MissingPermission -> 403
NotFound/OutOfScope -> 404
Conflict/Duplicate -> 409
Unexpected -> 500
```

## Session Contract

Session/API auth payload should expose:

- current user identity
- active company context when applicable
- company role/permissions when applicable
- `isPlatformAdmin: boolean`

Do not infer platform admin from company role on the frontend.

## Endpoint Groups

Current/target groups:

- auth/session
- companies
- departments
- department members
- boards
- board members
- columns
- tasks
- comments
- attachments
- watchers
- access requests
- epics
- notifications

## Frontend API Client

The web app should call endpoints through `apps/web/src/api.ts` only. Components should not call `fetch()` directly.
