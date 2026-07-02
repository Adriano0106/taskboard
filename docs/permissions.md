# TaskBoard Permissions

## Direction

TaskBoard is moving from global company roles to scoped roles resolved into atomic effective permissions.

## Platform Admin

- Defined by config/env for now.
- Session/API exposes `isPlatformAdmin: boolean`.
- Only platform admins can access global platform administration and list all companies.
- Platform admin is separate from company membership.

## Scoped Roles

Company scope:

- Company Admin/Owner manages company data, departments, boards, members, and company permissions.

Department scope:

- `MANAGER`: manages department members, department boards, and permissions inside that department.
- `MEMBER`: can participate in department boards/tasks according to permission rules.
- `VIEWER`: read-only access to department boards/tasks.

Board scope:

- `MANAGER`: manages board configuration and board members.
- `MEMBER`: can create/interact with tasks.
- `VIEWER`: read-only access to the board.

## Precedence

Effective permissions should resolve using this precedence:

```text
PlatformAdmin > CompanyAdmin > DepartmentManager > BoardManager > Member > Viewer
```

Department membership grants default access to boards in that department. Board membership can grant board-specific access.

## Viewer Rules

Viewer can view board/task content but cannot:

- create tasks
- edit tasks
- move tasks
- comment
- attach files
- change watchers
- manage members
- manage columns
- change permissions

Backend must enforce this. Frontend should also hide or disable controls.

## Permission Catalog

Initial atomic permissions:

- `ViewBoard`
- `ManageBoard`
- `ManageColumns`
- `ViewTask`
- `CreateTask`
- `EditTask`
- `MoveTask`
- `DeleteTask`
- `CommentTask`
- `AttachFile`
- `ManageWatchers`
- `ManageMembers`
- `ManagePermissions`
- `ViewReports`
- `CreateEpic`
- `EditEpic`
- `LinkEpicTask`
- `ManageAccessRequests`

## Authorization Flow

```text
Authenticated request
Resolve active company/user
Resolve target resource scope
Load effective permissions
Authorize action
Run operation
Emit domain event when needed
```

Routes should delegate authorization to permission helpers/services.

## Access Requests

A user without access can request entry to a board, task, or epic.

States:

- `PENDING`
- `APPROVED`
- `REJECTED`

Approval should be handled by managers of the owner department of the requested resource. Approval normally creates a `DepartmentMember` or `BoardMember` link.

## Epics

- Epic belongs to one owner department.
- Epic can link tasks from boards in multiple departments.
- User sees linked tasks they can access.
- For inaccessible linked tasks, show a request-access CTA when supported.
- Being assigned/notified on an epic or task does not grant administrative permission.

## Testing Requirements

Sensitive actions should include focused tests for:

- allowed manager/admin/platform admin behavior
- blocked viewer mutation
- blocked cross-department/board access
- blocked unauthenticated access
- access request approve/reject permissions
- epic aggregation respecting visible scope
