# Codex Performance Guide

This project can become expensive for agentic coding because it has API, web, Prisma, docs, tests, and skills. Prefer small scoped prompts.

## Session Model

Treat a Codex session as a limited working set:

- every file read competes with the current task for attention
- long command outputs are as expensive as long source files
- old decisions can become weak after long sessions or compaction
- a new task should normally start with a fresh small context plan

Use `docs/context.md` as the light memory index. Open deeper docs only when the task needs them.

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

## Codex Operating Rules

- Ask Codex to state the expected read set before large work.
- Prefer "read only these files" over "understand the project".
- Prefer one layer per prompt: schema, repository, route, test, frontend API, hook, UI, or docs.
- Ask for a resume checkpoint before switching topics.
- If Codex starts reading broad areas, stop it and restate the slice.
- Keep outputs small: request summaries, not full command logs.

## Resume Prompt

```text
Antes de compactar ou encerrar, gere um checkpoint curto com:
objetivo atual, decisoes tomadas, arquivos alterados, validacoes rodadas,
riscos pendentes e o proximo passo exato.
```

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
- "Give me a checkpoint before continuing."
