# Skill: Add Prisma Migration

Use this skill only for Prisma schema and migration work.

## Read First

- `docs/database.md`.
- `docs/permissions.md` only if the schema change touches roles, scopes, access requests, or permission models.
- `apps/api/prisma/schema.prisma`.

Do not read API route files or frontend files unless the task explicitly asks to wire the schema into the app.

## Checklist

1. Update `schema.prisma` with the smallest compatible model change.
2. Add required relations, indexes, and unique constraints for expected access patterns.
3. Use nullable fields or backfill strategy when existing data could break migration.
4. Create migration SQL or Prisma migration according to the task.
5. Include backfill for existing data when needed.
6. Do not run `prisma generate`, `prisma format`, or `migrate deploy` unless requested or the task includes validation.
7. Stop before repository/API changes unless explicitly requested.

## Safety Rules

- Tenant-scoped models should include a path back to `Company` directly or through parent relations.
- Multi-row changes requiring consistency should be handled transactionally in repositories/services.
- Prefer explicit indexes for common lookups.
- Do not drop columns/data without explicit instruction.

## Stop Point

Stop after schema and migration diff unless validation or the next implementation layer was requested.
