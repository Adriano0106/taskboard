# Skill: Add Repository Function

Use this skill only for persistence or domain data access changes.

## Read First

- Identify the business domain and read its folder under `apps/api/src/repositories/<domain>/`.
- Read the domain facade and the focused repository file for the same responsibility.
- Related type file if one exists.
- `docs/database.md` only if relation/index behavior is unclear.
- `docs/permissions.md` only if the function resolves access or scoped permissions.

Do not read route tests or frontend files unless explicitly needed.

## Checklist

1. Create repositories inside `apps/api/src/repositories/<domain>/`; do not add repository files to the root.
2. Group code by business domain and give each file one primary responsibility.
3. Reuse an existing file only when the function matches that responsibility; otherwise create a focused repository.
4. Export public operations through `<domain>-repository.ts` when the domain has multiple repositories.
5. Keep domain-specific types, errors, mappers, defaults, and helpers inside the domain folder.
6. Prefer public facades for cross-domain imports and extract shared code only after concrete reuse exists.
7. Keep Prisma access inside repository/service infrastructure already used by the API.
8. Accept explicit parameters instead of passing large untyped objects.
9. Scope queries by company/resource/membership boundaries.
10. Return stable domain DTOs or existing repository result shapes.
11. Use transactions for multi-table writes that must succeed together.
12. Preserve existing error conventions.
13. Avoid hidden permission checks unless the repository already owns that pattern.

## Naming

Use descriptive names:

- `createAccessRequest`
- `findBoardMembershipForUser`
- `resolveEffectiveBoardPermissions`
- `linkTaskToEpic`

Avoid names like `handle`, `process`, `data`, `item`.

## Stop Point

Stop after repository/service changes unless the task explicitly asks for routes, tests, frontend, validation, or commit.
