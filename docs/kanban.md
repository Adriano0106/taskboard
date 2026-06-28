# TaskBoard Kanban

## Board Loading

The Kanban board list endpoint must return lightweight data:

- board id, key, name, and description
- ordered columns
- lightweight task cards

Task card payloads should avoid heavy fields. Full task details are loaded only when the user opens a task.

## Card Payload

Target card fields:

- `id`
- `friendlyId`
- `title`
- `type`
- `priority`
- `assigneeName`
- `commentCount`
- `attachmentCount`
- `dueDate`

The MVP currently returns the available subset and should expand incrementally.

## Task Creation

New tasks must be created only in the first column of the board.

Reason:

- keeps backlog/intake predictable
- avoids unclear workflow entry points
- matches the current frontend behavior
- is enforced by the backend

## Drag And Drop

The frontend uses DND Kit.

Target behavior:

- update the UI optimistically
- persist the new column and position through the API
- rollback if the API fails
- show a clear error message

The MVP can reorder affected rows directly. Before supporting very large boards, switch to a ranking strategy that avoids updating every task in a column.

## Column Management

Columns are configurable per board.

Current rules:

- owners and admins can create, rename, reorder, and delete columns
- members cannot manage columns
- a board must keep at least one column
- only empty columns can be deleted

Future rules should use permissions such as `ManageBoard` and `ManageColumns` instead of role names.

## Task Details

Opening a card should load detail data separately.

The detail drawer should evolve to include:

- description
- comments
- attachments
- activity
- watchers
- general task information
- custom fields
