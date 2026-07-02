# Skill: Add API Route

Use this skill only when adding or changing Fastify routes.

## Read First

- `docs/api.md` if endpoint conventions are unclear.
- `docs/permissions.md` only when the route authorizes scoped actions.
- The existing route file for the same domain.

Do not read frontend files for API-only work.

## Checklist

1. Define the route path and HTTP method.
2. Add `authenticateRequest` for protected endpoints.
3. Validate params/body/query with Zod and `.safeParse()`.
4. Resolve the current user/session context.
5. Call a service or repository function.
6. Map domain errors to HTTP status codes.
7. Return DTOs, not raw Prisma internals when a public shape exists.
8. Add or update tests only when requested or when this task includes tests.

## Route Rules

- Keep handlers thin.
- Do not embed complex permission logic in the route.
- Do not compare role strings directly.
- Use permission helpers/services for authorization.
- Use existing error mapping helpers when available.
- Use consistent response status codes:
  - `200` for successful reads/updates
  - `201` for created resources
  - `204` for successful delete/no body
  - `400` invalid input
  - `401` unauthenticated
  - `403` authenticated but missing permission
  - `404` resource not found or not visible in scope
  - `409` conflict

## Stop Point

After route changes, stop unless the user requested validation, tests, frontend work, or commit.
