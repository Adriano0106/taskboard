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

Board:

- `GET /boards/current/kanban`
- `POST /boards/current/tasks`
- `PATCH /tasks/:taskId/move`
- `GET /tasks/:taskId`
- `POST /boards/current/columns`
- `PATCH /boards/current/columns/:columnId`
- `PATCH /boards/current/columns/:columnId/reorder`
- `DELETE /boards/current/columns/:columnId`

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
