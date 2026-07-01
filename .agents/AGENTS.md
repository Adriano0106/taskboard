# TaskBoard — Regras do Agente

## Linguagem e Comunicação

- Responda sempre em **português brasileiro**.
- Use terminologia técnica em inglês (ex: "endpoint", "hook", "migration", "commit") quando for a convenção do projeto.

## Código

- Usar **TypeScript** em todos os arquivos `.ts` e `.tsx`.
- Indentação: **2 espaços**.
- Sem ponto e vírgula (`;`) no final das linhas.
- Usar nomes auto-descritivos — evitar variáveis genéricas como `i`, `j`, `data`, `item`.
- Priorizar legibilidade e manutenibilidade sobre brevidade.
- Não criar abstrações desnecessárias.
- Separar responsabilidades: rotas validam HTTP, repositories acessam Prisma, componentes renderizam UI.

## Commits

- Commits **pequenos e focados** — nunca acumular mudanças para commitar no final.
- Formato: `tipo: descrição curta em inglês` (ex: `feat: add task due dates`, `fix: prevent drag loop`).
- Separar em commits distintos: documentação, configuração, backend, frontend, testes, refatorações.

## Backend (API)

- Rotas Fastify sempre com `{ preHandler: authenticateRequest }` para endpoints protegidos.
- Validação de entrada com **Zod** via `.safeParse()` — nunca confiar em `request.body` sem validar.
- Permissões verificadas via `assertCompanyPermission` de `permissions.ts` — nunca comparar strings de role diretamente nas rotas.
- Lógica de negócio vai nos **repositories**, não nas rotas.
- Usar `prisma.$transaction()` para operações multi-tabela.
- Erros de domínio com classes específicas (`BoardError`, `CompanyError`) — não usar `Error` genérico no domínio.

## Frontend (Web)

- Estado remoto deve usar hooks customizados em `apps/web/src/hooks/`.
- Chamadas à API sempre via funções de `apps/web/src/api.ts` — nunca fazer `fetch()` direto em componentes.
- Controles de admin protegidos com `hasCompanyPermission` de `permissions.ts`.
- Estilos em SCSS em `styles.scss` ou módulos SCSS — nunca inline styles ou Tailwind.
- Componentes recebem props explícitas — nunca acessam `localStorage` ou estado global diretamente.

## Banco de Dados

- IDs: `String @id @default(cuid())`.
- Todos os modelos com `createdAt DateTime @default(now())` e `updatedAt DateTime @updatedAt` (exceto modelos imutáveis como `TaskWatcher`).
- Cascades: `onDelete: Cascade` para filhos, `onDelete: SetNull` para referências opcionais.
- Sempre rodar `npm run prisma:generate` após alterar o schema.

## Testes

- Testes de integração com **Vitest** + `app.inject()` + PostgreSQL real (porta 5433 para testes).
- Usar prefixo/domínio único por test suite para cleanup seguro no `afterEach`.
- Cobrir: sucesso (owner), sucesso (admin), erro 400, 401, 403, 404, 409.

## Limites de Arquivo

- Anexos: máximo **3 MB** por arquivo.
- Tasks criadas sempre na **primeira coluna** do board.

## Referências

- Arquitetura: `docs/architecture.md`
- Permissões: `docs/permissions.md`
- Guidelines de dev: `docs/development-guidelines.md`
- API: `docs/api.md`
- Banco: `docs/database.md`
