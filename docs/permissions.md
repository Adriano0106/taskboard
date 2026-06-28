# TaskBoard Permissions

## Direction

The MVP currently uses company roles for some decisions. This is acceptable temporarily, but the product must evolve to permission-based authorization.

Roles should become named bundles of permissions. Business actions should check permissions, not role names.

## Initial Roles

Current roles:

- `OWNER`
- `ADMIN`
- `MEMBER`

Current behavior:

- `OWNER` and `ADMIN` can manage board columns
- `MEMBER` cannot manage board columns

## Target Permissions

Initial permission catalog:

- `CreateTask`
- `EditTask`
- `MoveTask`
- `DeleteTask`
- `ViewTask`
- `CommentTask`
- `AttachFile`
- `ManageBoard`
- `ManageColumns`
- `InviteUsers`
- `ManageMembers`
- `ViewReports`
- `ManagePermissions`

Permissions should be evaluated in a scope:

- company
- department
- board
- task when needed in the future

## Authorization Flow

The target flow for protected actions:

```text
Authenticated request
Resolve active company
Resolve target resource scope
Load effective permissions
Authorize action
Run business operation
Emit domain event when needed
```

Routes must not embed complex permission rules. They should delegate authorization to domain services or permission helpers.

## Migration Path

Step 1:

- keep existing roles
- centralize role checks in permission helpers
- stop spreading `OWNER` and `ADMIN` checks through route code

Step 2:

- add `Permission` and `Role` models
- seed default roles
- map existing roles to default permission bundles

Step 3:

- allow board-specific members and permissions
- update routes to check permissions by action name

Step 4:

- add UI for managing roles and board members

## Testing Requirements

Every sensitive action should have tests for:

- allowed owner/admin access
- blocked member access
- blocked unauthenticated access
- blocked access across companies

Column management already follows this direction and should be used as the first permission refactor target.
