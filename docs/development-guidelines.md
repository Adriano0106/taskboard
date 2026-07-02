# Development Guidelines

This file is intentionally short. Agent-specific workflow rules are in `.agents/WORKFLOW.md`.

## Style

- TypeScript everywhere possible.
- 2 spaces indentation.
- No semicolons.
- Descriptive variable names.
- Small functions with clear responsibilities.
- Avoid premature abstractions.

## Architecture

- Keep route, repository, hook, and component responsibilities separated.
- Use documentation files as source of truth instead of duplicating rules in skills.
- Implement large features in small slices.

## Commits

Use concise conventional prefixes:

- `feat:` feature
- `fix:` bug fix
- `chore:` tooling/config/internal task
- `docs:` documentation
- `test:` tests
- `refactor:` behavior-preserving refactor
