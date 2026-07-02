# Skill: Write Route Tests

Use this skill only when adding or changing API route tests.

## Read First

- Existing test file for the route/domain.
- Route file only for the endpoints under test.
- Repository/test helper only if the existing test setup requires it.

Do not read frontend files.

## Test Style

- Use Vitest and `app.inject()` following existing test patterns.
- Create unique test data per suite/test to avoid cross-test collisions.
- Clean up using the existing project helper/pattern.
- Prefer focused tests over broad end-to-end coverage.

## Coverage Checklist

For protected routes, cover the relevant subset:

- success path
- `400` invalid input
- `401` unauthenticated
- `403` missing permission
- `404` not found or not visible in scope
- `409` conflict when applicable

For scoped permissions, cover at least:

- allowed manager/admin action
- blocked viewer mutation
- blocked cross-scope access

## Validation

Run only the focused test file unless the user asks for a broader suite.

Example:

```powershell
npm run test --workspace @taskboard/api -- --run src/http/routes/board-routes.test.ts
```
