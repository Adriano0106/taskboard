# TaskBoard Deployment

## Local Development

- Use Docker/PostgreSQL for local database.
- Keep environment variables documented in `.env.example` when available.
- Run migrations before starting the API when schema changed.

## Validation Strategy

Prefer focused validation during development:

- API route tests for backend route changes.
- API build for backend contract/type changes.
- Web build for frontend type/API contract changes.
- Prisma generate after schema changes.

Run full validation before merge/release, not after every small slice unless requested.

## Future Deployment Concerns

- PostgreSQL managed database.
- File storage provider for attachments.
- Background worker for notifications/audit/automation.
- Realtime channel for board updates.
- Environment-based platform admin configuration.
