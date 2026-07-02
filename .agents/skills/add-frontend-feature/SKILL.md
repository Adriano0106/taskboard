# Skill: Add Frontend Feature

Use this skill only for React/Vite frontend work.

## Read First

- `docs/kanban.md` for board/task UX behavior.
- `docs/permissions.md` only if controls depend on authorization.
- Existing component/hook/API files in the same feature area.

Do not read backend repositories or Prisma schema for frontend-only work. Use the API contract provided by the task or `apps/web/src/api.ts`.

## Checklist

1. Add/update API client function in `apps/web/src/api.ts` when needed.
2. Add/update custom hook in `apps/web/src/hooks/` for remote state.
3. Keep components focused on rendering and user interaction.
4. Pass explicit props.
5. Hide or disable controls based on effective permissions.
6. Preserve Viewer read-only behavior.
7. Use existing SCSS conventions.
8. Do not introduce new state libraries without explicit request.

## UI Permission Rules

- Hiding a control is not security; backend must still authorize.
- Viewer can view boards/tasks but cannot create, edit, move, comment, attach files, change watchers, or manage members.
- If the user lacks access to a linked board/task, show a request-access CTA when the API supports it.

## Stop Point

Stop after frontend changes unless the user requested backend work, validation, tests, or commit.
