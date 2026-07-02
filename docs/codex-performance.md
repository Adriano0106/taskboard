# Codex Performance Guide

This project can become expensive for agentic coding because it has API, web, Prisma, docs, tests, and skills. Prefer small scoped prompts.

## Good Prompt Pattern

```text
Modo econômico.
Use only .agents/skills/add-api-route/SKILL.md.
Do not read frontend files.
Do not run build, lint, tests, prisma generate, or commit.
Scope: apps/api/src/http/routes and apps/api/src/repositories.
Implement only AccessRequest backend routes.
Stop after showing the diff summary.
```

## Avoid

```text
Implement this entire plan across backend, frontend, database, tests, docs, and commits.
```

That forces the agent to read many skills, docs, API files, repositories, UI files, tests, migrations, and then run validation loops.

## Suggested Large Feature Flow

1. Ask for a plan only.
2. Ask for Prisma schema/migration only.
3. Ask for repositories only.
4. Ask for routes only.
5. Ask for route tests only.
6. Ask for frontend client/hooks only.
7. Ask for UI only.
8. Ask for validation.
9. Ask for commit.

## Command Budget

Ask Codex to avoid commands unless needed. Examples:

- Avoid reading all `.agents/skills/*/SKILL.md`.
- Avoid `rg` across the whole repository.
- Avoid `npm run build` after every small change.
- Avoid `npm run lint` until a slice is ready.
- Avoid `prisma generate` unless Prisma schema changed.

## Best Scope Phrases

- "Consider only `apps/api/src/repositories`."
- "Assume the API contract already exists."
- "Do not inspect frontend files."
- "Read only the files you must edit."
- "Stop before validation."
- "Do not commit."

