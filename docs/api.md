# TaskBoard API

## Style

The API is REST-first.

General rules:

- JSON request and response bodies
- Bearer JWT authentication
- Zod validation for all request bodies and params
- explicit HTTP status codes
- DTOs that match each use case
- no heavy fields in list endpoints

## Current Endpoints

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Company:

- `GET /companies/current`
- `PATCH /companies/current`
- `GET /companies/current/members`
- `POST /companies/current/members`
- `PATCH /companies/current/members/:userId`
- `DELETE /companies/current/members/:userId`
- `POST /companies/current/departments`
- `PATCH /companies/current/departments/:departmentId`
- `DELETE /companies/current/departments/:departmentId`
- `POST /companies/current/departments/:departmentId/boards`
- `PATCH /companies/current/boards/:boardId`
- `DELETE /companies/current/boards/:boardId`
- `GET /companies/:companyId`
- `GET /companies/by-slug/:companySlug`
- `GET /admin/companies`

Board:

- `GET /boards/current/kanban`
- `POST /boards/current/tasks`
- `PATCH /tasks/:taskId/move`
- `GET /tasks/:taskId`
- `GET /tasks/:taskId/attachments`
- `POST /tasks/:taskId/attachments`
- `GET /tasks/:taskId/attachments/:attachmentId/download`
- `DELETE /tasks/:taskId/attachments/:attachmentId`
- `POST /boards/current/columns`
- `PATCH /boards/current/columns/:columnId`
- `PATCH /boards/current/columns/:columnId/reorder`
- `DELETE /boards/current/columns/:columnId`

Attachments:

- Maximum file size: 3 MB
- Local storage directory: `ATTACHMENT_STORAGE_DIR`, defaulting to `uploads`
- Storage access goes through `StorageProvider` so remote providers can be plugged in later

Health:

- `GET /health`

## Error Shape

Errors should return:

```json
{
  "message": "Human readable error"
}
```

Validation errors can include:

```json
{
  "message": "Invalid payload",
  "issues": {}
}
```

## Status Codes

Use:

- `200` for successful reads and updates
- `201` for created resources
- `400` for validation errors
- `401` for unauthenticated access
- `403` for authenticated but unauthorized access
- `404` for missing or inaccessible resources
- `409` for business conflicts

## DTO Direction

Use separate DTOs for:

- Kanban board list view
- task card
- task detail
- task comment list
- notification list
- audit log list

Avoid returning raw Prisma models directly from route handlers as the product grows.
