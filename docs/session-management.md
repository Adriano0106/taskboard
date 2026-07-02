# Session Management For Codex

Use this guide when a task is long, expensive, or likely to cross backend, frontend, database, tests, and docs.

## Core Idea

The session is not project memory. It is a temporary working set.

Keep permanent guidance in small index files:

- `.agents/AGENTS.md`: always-on behavior and boundaries
- `.agents/WORKFLOW.md`: low-context workflow
- `docs/context.md`: project memory index
- topic docs under `docs/`: deeper chapters read only on demand

## Start Of Task

Before implementing, define:

```text
Slice:
Skill:
Docs:
Files:
Validation:
Stop point:
```

If any field grows too large, split the task.

## During Task

- Read symbols and short file sections before whole files.
- Prefer `git diff --stat` before full diffs.
- Prefer focused tests before full validation.
- Avoid switching from backend to frontend unless the current slice requires it.
- Do not keep investigating after the implementation path is clear.

## End Of Task

Summarize:

- what changed
- what was validated
- what remains
- commit hash, when committed

## Checkpoint Template

```text
Objective:
Current state:
Files changed:
Decisions:
Validation:
Risks:
Next step:
```
