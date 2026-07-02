# TaskBoard â€” Agent Rules

## Communication

- Respond in Brazilian Portuguese.
- Keep technical terms in English when they are project conventions: endpoint, hook, migration, commit, repository, service.
- Be direct about what changed, what was validated, and what still needs attention.

## Context Budget Rules

- Start with `docs/context.md` when general project context is needed.
- Do not read all skills automatically.
- Read only the one skill that directly matches the current task.
- Do not read `docs/*` broadly. Use the official source for the topic:
  - architecture: `docs/architecture.md`
  - database: `docs/database.md`
  - permissions: `docs/permissions.md`
  - API conventions: `docs/api.md`
  - frontend/Kanban behavior: `docs/kanban.md`
  - notifications: `docs/notifications.md`
  - deployment: `docs/deployment.md`
- Prefer targeted file reads over broad searches.
- Avoid `rg` across the whole project unless the target location is unknown.
- Do not run build, lint, tests, Prisma generate, Prisma format, or commit unless the task asks for validation/commit or the change requires it.

## Code Style

- Use TypeScript in `.ts` and `.tsx` files.
- Indentation: 2 spaces.
- No semicolons.
- Prefer descriptive names over short names. Avoid `i`, `j`, `data`, `item` when a clearer name exists.
- Prioritize readability and maintainability.
- Do not create abstractions before there is a clear need.

## Project Boundaries

- API routes validate HTTP input and map errors/status codes.
- Services contain business orchestration when needed.
- Repositories own Prisma access.
- Components render UI and receive explicit props.
- Hooks own frontend remote state and API orchestration.
- API calls from the frontend go through `apps/web/src/api.ts`.
- Components must not call `fetch()` directly.
- Do not access Prisma outside repository/service infrastructure already used by the API.

## Backend Rules

- Protected Fastify routes must use `authenticateRequest`.
- Validate request bodies and params with Zod and `.safeParse()`.
- Do not compare role strings directly in route handlers.
- Use permission helpers from the backend authorization layer.
- Use `prisma.$transaction()` for multi-table changes that must be atomic.
- Use domain errors such as `BoardError` and `CompanyError` when the domain already has them.

## Frontend Rules

- Remote state belongs in custom hooks under `apps/web/src/hooks/`.
- Keep `App.tsx` focused on root orchestration. Extract large feature sections.
- Hide or disable controls based on effective permissions from the current context.
- Viewer mode is read-only: no create, edit, move, comment, attach, watcher changes, or permission changes.
- Use SCSS project conventions. Do not introduce Tailwind or inline styles unless explicitly requested.

## Database Rules

- IDs use the project Prisma convention already present in the schema.
- Add indexes that match access patterns.
- Tenant/company-scoped data must be queried with a company/resource boundary.
- Every schema change must include a migration unless explicitly doing planning only.
- Run Prisma commands only when asked or when the current task explicitly includes schema/migration implementation.

## Commits

- Commit only when the user asks for commits or when the current plan explicitly says to commit.
- Commit format: `feat: short description`, `fix: short description`, `chore: short description`, `docs: short description`.
- Keep commits small and scoped by layer or feature.

## Validation

- Prefer focused validation over full-project validation.
- For API route changes, run the focused route test when requested.
- For frontend-only changes, run the web build only when requested or when type contracts changed.
- For schema changes, run Prisma format/generate only when requested or when implementing the migration.
