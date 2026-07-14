# TaskBoard — Low-Context Codex Workflow

Use this file to reduce unnecessary repository exploration and quota usage.

## Default Mode

1. Identify the smallest deliverable slice.
2. Write a tiny context plan: skill, docs, and files expected to be read.
   For backend features, name the affected domain and expected files under `apps/api/src/repositories/<domain>/`.
3. Read at most one matching skill.
4. Read only files that are necessary for the slice.
5. Implement the smallest safe diff.
6. Stop and summarize the diff unless validation or commit was requested.

## Do Not Do By Default

- Do not read every skill.
- Do not scan the whole repository.
- Do not open docs unrelated to the current task.
- Do not run full build/lint/test cycles automatically.
- Do not run Prisma commands unless schema changed.
- Do not commit unless asked.
- Do not start frontend work during backend-only tasks.
- Do not start backend work during frontend-only tasks.
- Do not continue a new task in the old mental model. Re-check the current request and only then proceed.

## When to Read Each Skill

- `add-prisma-migration`: Prisma schema and migration only.
- `add-repository-function`: domain repository/service persistence logic only.
- `add-api-route`: Fastify route contract and HTTP behavior only.
- `write-route-tests`: route tests only.
- `add-frontend-feature`: React/API/hook/component UI work only.

## Recommended Slices

For large features, split in this order:

1. Database schema and migration.
2. Repository functions.
3. Permission helper or service logic.
4. API routes.
5. Route tests.
6. Frontend API client.
7. Frontend hooks and components.
8. Styling and UX polish.
9. Final focused validation.
10. Review the diff and choose one or more small commits grouped by layer or responsibility.
11. Commit.

## Command Policy

Use targeted commands first:

```powershell
Get-Content path\to\file.ts | Select-Object -First 120
rg "ExactSymbol" apps/api/src/repositories/<domain> -n
npm run test --workspace @taskboard/api -- --run src/http/routes/specific-routes.test.ts
```

Prefer small outputs:

```powershell
git diff --stat
git diff -- path/to/file.ts
Select-String -Path path\to\file.ts -Pattern "ExactSymbol" -Context 2,4
```

Avoid broad commands unless necessary:

```powershell
rg "role|permission|member" . -n
npm run build
npm run lint
```

## Stop Points

Stop after a slice when:

- The requested scope is done.
- The next step requires another layer.
- The next step requires schema generation, build, tests, or commit not explicitly requested.
- The agent would need to read a large unrelated area of the project.

## Repository Domain Check

Before implementing repository changes:

1. Identify the business domain and start in `apps/api/src/repositories/<domain>/`.
2. Reuse a focused repository only when the new behavior matches its primary responsibility.
3. Create a focused repository when the behavior represents a separate aggregate or workflow.
4. Add public exports to `<domain>-repository.ts` when the domain has multiple repository files.
5. Keep routes dependent on the facade and domain internals behind it.
6. Keep types, errors, mappers, defaults, and helpers local to their domain unless multiple domains already require them.

## Resume Checkpoint

Before compaction, handoff, or a long pause, summarize only:

- current objective
- committed/uncommitted changes
- files changed
- validation already run
- known blockers
- next exact command or file to edit
