# TaskBoard Deployment And Local Runtime

## Local Services

Local development uses Docker Compose for PostgreSQL.

Port rule:

- prefer PostgreSQL on host port `5432`
- if `5432` is occupied, use `5433`
- keep `.env` and `.env.example` aligned with the chosen port

Current local fallback example:

```text
POSTGRES_HOST_PORT="5433"
DATABASE_URL="postgresql://taskboard:taskboard@localhost:5433/taskboard?schema=public"
```

## Local Startup

Start infrastructure:

```bash
docker compose up -d
```

Run both apps:

```bash
npm run dev
```

Stop local app processes:

```bash
npm run dev:stop
```

## Database Migrations

Apply migrations:

```bash
cd apps/api
npx prisma migrate deploy
```

If the shell does not load `.env`, set `DATABASE_URL` explicitly before running Prisma commands.

PowerShell example:

```powershell
$env:DATABASE_URL='postgresql://taskboard:taskboard@localhost:5433/taskboard?schema=public'
npx prisma migrate deploy
```

After schema changes:

```bash
npm run prisma:generate
```

## Validation Before Delivery

Run:

```bash
npm run lint
npm run build
npm run test
```

For database changes, also confirm migrations apply against the local PostgreSQL container.

## Future Production Notes

Production should include:

- managed PostgreSQL
- environment-specific secrets
- HTTPS termination
- API rate limit
- structured logs
- health checks
- backup policy
- migration execution during deploy
- file storage provider outside the API filesystem when attachments leave MVP local storage
