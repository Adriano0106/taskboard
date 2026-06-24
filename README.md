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

## Scripts

- `npm run dev`: inicia os workspaces em modo desenvolvimento
- `npm run build`: compila API e web
- `npm run lint`: valida formatação e regras estáticas
- `npm run test`: executa testes dos workspaces
- `npm run prisma:generate`: gera o Prisma Client da API
