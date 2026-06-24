# TaskBoard

Aplicação web para gestão de tarefas, quadros Kanban e suporte corporativo.

## Stack

- Backend: Node.js, TypeScript, Fastify e Prisma
- Frontend: React, Vite e TypeScript
- Banco de dados: PostgreSQL
- Ambiente local: Docker Compose

## Desenvolvimento

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run prisma:generate
npm run dev
```

API: `http://localhost:3333`

Web: `http://localhost:5173`

O comando `npm run dev` inicia backend e frontend juntos. Para rodar separadamente:

```bash
npm run dev:api
npm run dev:web
```

Se algum processo local ficar preso segurando portas de desenvolvimento, rode:

```bash
npm run dev:stop
```

PostgreSQL local usa a porta `5432` por padrão. Se a porta estiver ocupada, altere no `.env`:

```bash
POSTGRES_HOST_PORT="5433"
DATABASE_URL="postgresql://taskboard:taskboard@localhost:5433/taskboard?schema=public"
```

Depois recrie o container:

```bash
docker compose up -d postgres
```

## Scripts

- `npm run dev`: inicia os workspaces em modo desenvolvimento
- `npm run build`: compila API e web
- `npm run lint`: valida formatação e regras estáticas
- `npm run test`: executa testes dos workspaces
- `npm run prisma:generate`: gera o Prisma Client da API
