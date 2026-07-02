# Skill: Add Repository Function

Use this skill only for persistence or domain data access changes.

## Read First

- The repository file in the same domain.
- Related type file if one exists.
- `docs/database.md` only if relation/index behavior is unclear.
- `docs/permissions.md` only if the function resolves access or scoped permissions.

Do not read route tests or frontend files unless explicitly needed.

## Checklist

1. Keep Prisma access inside repository/service infrastructure already used by the API.
2. Accept explicit parameters instead of passing large untyped objects.
3. Scope queries by company/resource/membership boundaries.
4. Return stable domain DTOs or existing repository result shapes.
5. Use transactions for multi-table writes that must succeed together.
6. Preserve existing error conventions.
7. Avoid hidden permission checks unless the repository already owns that pattern.

## Naming

Use descriptive names:

- `createAccessRequest`
- `findBoardMembershipForUser`
- `resolveEffectiveBoardPermissions`
- `linkTaskToEpic`

Avoid names like `handle`, `process`, `data`, `item`.

## Stop Point

Stop after repository/service changes unless the task explicitly asks for routes, tests, frontend, validation, or commit.
