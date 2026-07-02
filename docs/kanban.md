# TaskBoard Kanban

## Board Behavior

- A board belongs to a department.
- Columns are configurable by authorized users.
- Column order uses `position`.
- Tasks are created in the first column by default.
- Task order within a column uses `position`.
- Drag and drop should preserve order and rollback on API failure when optimistic updates are introduced.

## Task Cards

Cards should show only the most useful summary data:

- friendly ID
- title
- type/status/priority when available
- assignee when available
- due date when available
- attachment/comment indicators when available

Details should load on demand in a drawer/page to keep the board lightweight.

## Permissions in UI

- Viewer sees the board in read-only mode.
- Viewer controls for create/edit/move/comment/attach/watchers should be hidden or disabled.
- Department/board members can interact according to effective permission payloads.
- Managers can access board/member/column management controls.

## Multi-Department Epics

Epic screens should aggregate linked tasks by department and board.

If the user cannot access a linked task's board:

- show limited metadata when allowed by API
- show a request-access CTA
- do not expose restricted task details
