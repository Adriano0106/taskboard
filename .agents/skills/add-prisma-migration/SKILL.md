---
name: add-prisma-migration
description: Create and apply a Prisma migration in the TaskBoard project, following the established schema conventions for models, relations, indexes, and enum values.
---

# Skill: Add Prisma Migration

## Context

The TaskBoard database is **PostgreSQL** managed by **Prisma**. The schema is at `apps/api/prisma/schema.prisma`.

Migrations are created with `prisma migrate dev` and applied with `prisma migrate deploy`.

## Schema Conventions

### IDs
All models use `String @id @default(cuid())`.

### Timestamps
All models include:
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

Immutable junction models (e.g., `TaskWatcher`) omit `updatedAt`.

### Soft Delete
Not currently used. Use hard delete with Prisma's `onDelete` cascade rules.

### Cascade Rules
- Child models use `onDelete: Cascade` when the parent is deleted (e.g., task → column → board → department → company).
- Task assignee uses `onDelete: SetNull` to preserve the task when a user is removed.

### Unique Constraints
- Use `@@unique([fieldA, fieldB])` for composite uniqueness (e.g., `[boardId, position]`, `[userId, companyId]`).

### Indexes
- Use `@@index([field1, field2])` for frequent queries (e.g., `[boardId, columnId, position]`, `[taskId, createdAt]`).

### Enums
Prisma enums are defined at the top of the schema:
```prisma
enum MyNewEnum {
  VALUE_A
  VALUE_B
}
```

## Model Template

```prisma
model MyNewModel {
  id          String    @id @default(cuid())
  name        String
  // relations
  parent      Parent    @relation(fields: [parentId], references: [id], onDelete: Cascade)
  parentId    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([parentId, name])
  @@index([parentId, createdAt])
}
```

Remember to add the back-relation on the parent model:
```prisma
model Parent {
  // ...
  myNewModels MyNewModel[]
}
```

## Migration Workflow

```bash
# 1. Edit the schema
# apps/api/prisma/schema.prisma

# 2. Create the migration
npm run prisma:migrate --workspace @taskboard/api
# or directly:
cd apps/api && npx prisma migrate dev --name describe-the-change

# 3. Regenerate the Prisma client
npm run prisma:generate

# 4. Restart the API dev server so new models are available
```

> The local PostgreSQL container runs on port `5432` by default (or `5433` if there's a conflict — see `.env`).

## Adding Enum Values

When adding a new value to an existing enum (e.g., `TaskActivityType`):
1. Add the new value to the enum in `schema.prisma`.
2. Run `prisma migrate dev`.
3. Update the `TaskActivityType` union type in `apps/web/src/api.ts` to match.
4. Update the activity description logic in the frontend (`TaskActivities.tsx`) to handle the new value.

## Adding Columns to Existing Tables

When adding a column to an existing model with required data (`NOT NULL`), either:
- Give it a `@default(...)` value in Prisma, or
- Use a multi-step migration: add as nullable → backfill → make required.

Prisma will warn if a migration would fail on existing data.

## Schema Integrity Rules

- Never remove a field without a migration.
- Keep `schema.prisma` as the single source of truth for the database shape.
- Always run `prisma:generate` after schema changes so the TypeScript client stays in sync.
- The `TaskActivity.metadata` field is `Json?` — use it to store before/after values for change history without new columns.
