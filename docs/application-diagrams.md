# TaskBoard — Diagramas da Aplicação

Este documento representa a arquitetura implementada no repositório. Os diagramas usam
[Mermaid](https://mermaid.js.org/) para permanecerem versionáveis e renderizáveis no GitHub,
GitLab e editores com suporte a Mermaid.

## 1. Visão geral do sistema

```mermaid
flowchart LR
  actor[Usuário / Platform Admin]

  subgraph client[Cliente]
    browser[Browser]
    react[React SPA<br/>Vite + TypeScript + SCSS]
  end

  subgraph backend[Backend]
    api[Fastify API<br/>REST + JWT + Zod]
    permissions[Autenticação e<br/>permissões efetivas]
    repositories[Repositories<br/>por domínio]
    prisma[Prisma Client]
    storage[StorageProvider]
  end

  postgres[(PostgreSQL)]
  uploads[(Arquivos de anexos)]

  actor --> browser --> react
  react -->|JSON / Bearer JWT| api
  api --> permissions
  api --> repositories
  permissions --> prisma
  repositories --> prisma
  repositories --> storage
  prisma --> postgres
  storage --> uploads
```

## 2. Monorepo e camadas

```mermaid
flowchart TB
  subgraph web[apps/web]
    pages[Pages e Components]
    hooks[Custom hooks]
    webapi[api.ts]
    routing[routing.ts + session-storage.ts]
    styles[SCSS + tema da empresa]

    pages --> hooks --> webapi
    pages --> routing
    pages --> styles
  end

  subgraph api[apps/api]
    server[server.ts / env.ts]
    app[app.ts / Fastify plugins]
    routes[HTTP routes]
    auth[JWT guard + AuthService]
    authorization[Company permissions<br/>+ scoped permissions]

    subgraph domains[Repositories por domínio]
      userrepo[user]
      companyrepo[company]
      boardrepo[board]
      accessrepo[access-request]
      storagerepo[storage]
    end

    prismaclient[Prisma Client]

    server --> app --> routes
    routes --> auth
    routes --> authorization
    routes --> domains
    auth --> userrepo
    authorization --> prismaclient
    userrepo --> prismaclient
    companyrepo --> prismaclient
    boardrepo --> prismaclient
    accessrepo --> prismaclient
  end

  webapi -->|HTTP REST| routes
  prismaclient --> database[(PostgreSQL)]
  boardrepo --> storagerepo --> attachments[(uploads)]
```

| Camada | Responsabilidade principal |
| --- | --- |
| Components | Renderização, formulários e eventos de UI |
| Hooks | Estado remoto e orquestração das ações do frontend |
| `api.ts` | Contratos HTTP, headers, payloads e parsing de respostas |
| Routes | Autenticação, validação Zod e mapeamento HTTP |
| Services | Orquestração de regras quando há fluxo além da persistência |
| Permission helpers | Resolução de permissões globais e por escopo |
| Repositories | Regras de domínio, queries, transactions e persistência |
| Prisma | Acesso tipado ao PostgreSQL |
| StorageProvider | Conteúdo dos anexos |

## 3. Mapa funcional do frontend

```mermaid
flowchart TB
  app[App.tsx<br/>orquestração raiz]

  app --> authPage[AuthPage]
  app --> adminPage[AdminCompaniesPage]
  app --> workspacePage[CompanyWorkspacePage]
  app --> boardPage[BoardPage]
  app --> profilePage[ProfilePage]
  app --> taskDialog[TaskDetailDialog]
  app --> header[WorkspaceHeader]

  workspacePage --> members[CompanyMembersPanel]
  boardPage --> column[KanbanColumnView]
  boardPage --> createTask[CreateTaskDialog]
  boardPage --> organizer[ColumnOrganizerDialog]
  taskDialog --> comments[TaskComments]
  taskDialog --> attachments[TaskAttachments]
  taskDialog --> activities[TaskActivities]
  taskDialog --> watchers[TaskWatchers]

  app --> navigation[useAppNavigation]
  app --> workspaceData[useWorkspaceData]
  app --> structure[useWorkspaceStructureActions]
  app --> boardActions[useBoardActions]
  app --> memberActions[useCompanyMembersManagement]
  app --> taskHooks[Comments / Attachments<br/>Activities / Watchers hooks]
  app --> companyTheme[useCompanyTheme]

  navigation --> apiClient[api.ts]
  workspaceData --> apiClient
  structure --> apiClient
  boardActions --> apiClient
  memberActions --> apiClient
  taskHooks --> apiClient
```

## 4. Mapa funcional da API

```mermaid
flowchart LR
  client[Frontend / API client]

  subgraph routes[Fastify routes]
    health[/health/]
    authRoutes[/auth/*/]
    companyRoutes[/companies/*<br/>/admin/companies/]
    boardRoutes[/boards/*<br/>/tasks/*/]
    requestRoutes[/access-requests/*/]
    userRoutes[/users/*/]
  end

  guard[authenticateRequest<br/>JWT + membership ativa]
  zod[Zod safeParse]
  authService[AuthService]
  permission[Company + scoped<br/>permission helpers]

  subgraph repos[Domain repositories]
    users[User repository]
    companies[Company facade<br/>settings, members,<br/>departments e boards]
    boards[Board facade<br/>columns, tasks, comments,<br/>watchers, activities e attachments]
    requests[Access request repository]
  end

  prisma[Prisma Client]
  files[LocalStorageProvider]

  client --> routes
  authRoutes --> zod --> authService --> users
  companyRoutes --> guard --> zod
  boardRoutes --> guard
  requestRoutes --> guard
  userRoutes --> guard
  guard --> permission
  companyRoutes --> companies
  boardRoutes --> permission --> boards
  requestRoutes --> permission --> requests
  users --> prisma
  companies --> prisma
  boards --> prisma
  requests --> prisma
  boards --> files
```

## 5. Autenticação e autorização

```mermaid
sequenceDiagram
  actor U as Usuário
  participant W as React SPA
  participant A as Fastify API
  participant S as AuthService
  participant R as UserRepository
  participant DB as PostgreSQL

  U->>W: Informa e-mail e senha
  W->>A: POST /auth/login
  A->>S: login(credentials)
  S->>R: findByEmail(email)
  R->>DB: User + membership ativa
  DB-->>R: Conta e empresa primária
  R-->>S: Usuário ou null
  S->>S: bcrypt.compare + permissões

  alt Credenciais válidas e membership ativa
    S-->>A: AuthenticatedAccount
    A-->>W: JWT + user + company + permissions
    W->>W: Persiste sessão local
  else Inválido ou inativo
    A-->>W: 401 Unauthorized
  end

  Note over W,A: Em cada endpoint protegido
  W->>A: Request com Bearer JWT
  A->>A: jwtVerify + membership.isActive
  A->>DB: Resolve permissões do recurso
  DB-->>A: Roles e escopos
  A-->>W: Resultado ou 401/403
```

```mermaid
flowchart LR
  platform[Platform Admin] --> company[Company OWNER / ADMIN]
  company --> department[Department MANAGER]
  department --> board[Board MANAGER]
  board --> member[MEMBER]
  member --> viewer[VIEWER]

  viewer -.->|somente leitura| view[ViewBoard / ViewTask]
  member -.->|operações| task[Create / Edit / Move Task]
  board -.->|configuração| manageBoard[Board / Columns / Members]
  department -.->|herança| departmentBoards[Boards do departamento]
  company -.->|administração| companyAdmin[Empresa, estrutura e membros]
  platform -.->|plataforma| allCompanies[Todas as empresas]
```

## 6. Ciclo de uma task

```mermaid
sequenceDiagram
  actor U as Usuário
  participant C as React Component
  participant H as useBoardActions
  participant API as api.ts
  participant R as Board route
  participant P as Permission helper
  participant BR as Board repository
  participant DB as PostgreSQL

  U->>C: Cria, edita ou move task
  C->>H: Formulário / drag-and-drop
  H->>API: Payload tipado
  API->>R: HTTP + JWT
  R->>R: Zod safeParse
  R->>P: Autoriza ação no board
  P->>DB: Memberships e escopos
  DB-->>P: Permissões efetivas
  P-->>R: Permitido
  R->>BR: Executa operação
  BR->>DB: Transaction da task
  BR->>DB: Registra TaskActivity
  DB-->>BR: Board/task atualizados
  BR-->>R: DTO de domínio
  R-->>API: JSON
  API-->>H: Estado atualizado
  H-->>C: Re-render
```

Regras centrais:

- nova task entra somente na primeira coluna;
- `friendlyId` e sequência são únicos dentro do board;
- somente membros ativos podem receber tasks;
- mutations exigem permissão efetiva no escopo;
- comentários, watchers, anexos e mudanças relevantes possuem histórico;
- conteúdo do anexo fica no storage e metadados ficam no PostgreSQL.

## 7. Modelo de dados completo

```mermaid
erDiagram
  User ||--o{ CompanyMember : possui
  Company ||--o{ CompanyMember : agrega
  Company ||--o{ Department : possui
  Company ||--o{ AccessRequest : recebe
  Company ||--o{ Epic : organiza

  User ||--o{ DepartmentMember : participa
  Department ||--o{ DepartmentMember : agrega
  Department ||--o{ Board : possui
  Department ||--o{ Epic : lidera
  Department ||--o{ AccessRequest : alvo

  User ||--o{ BoardMember : participa
  Board ||--o{ BoardMember : agrega
  Board ||--o{ BoardColumn : organiza
  Board ||--o{ Task : contem
  Board ||--o{ AccessRequest : alvo
  BoardColumn ||--o{ Task : posiciona
  User o|--o{ Task : responsavel

  Task ||--o{ TaskComment : possui
  User ||--o{ TaskComment : escreve
  Task ||--o{ TaskWatcher : possui
  User ||--o{ TaskWatcher : acompanha
  Task ||--o{ TaskActivity : registra
  User ||--o{ TaskActivity : executa
  Task ||--o{ TaskAttachment : possui
  User ||--o{ TaskAttachment : envia

  Epic ||--o{ EpicTaskLink : agrupa
  Task ||--o{ EpicTaskLink : vincula
  Board ||--o{ EpicTaskLink : contextualiza
  Epic ||--o{ AccessRequest : alvo
  User ||--o{ AccessRequest : solicita
  User o|--o{ AccessRequest : revisa
```

```mermaid
flowchart TB
  company[Company<br/>tenant boundary]
  company --> companyMembers[CompanyMember<br/>role + isActive]
  company --> departments[Department]
  departments --> departmentMembers[DepartmentMember<br/>scoped role]
  departments --> boards[Board]
  boards --> boardMembers[BoardMember<br/>scoped role]
  boards --> columns[BoardColumn]
  boards --> tasks[Task]
  tasks --> collaboration[Comments + Watchers<br/>Activities + Attachments]
  departments --> epics[Epic]
  epics --> links[EpicTaskLink]
  links --> tasks
  company --> access[AccessRequest]
  access --> departments
  access --> boards
  access --> epics
```

## 8. Deployment com Docker Compose

```mermaid
flowchart TB
  browser[Browser<br/>localhost:5173]

  subgraph docker[Docker Compose network]
    web[Nginx<br/>taskboard-web :80]
    api[Node.js / Fastify<br/>taskboard-api :3333]
    postgres[PostgreSQL 16<br/>taskboard-postgres :5432]
    migration[Prisma migrate deploy]
    seed[Prisma seed<br/>SEED_DATABASE=true]
  end

  dbvolume[(taskboard-postgres-data)]
  uploadvolume[(taskboard-uploads)]

  browser -->|HTTP :5173| web
  browser -->|REST :3333| api
  migration --> postgres
  seed --> postgres
  migration --> api
  seed --> api
  api --> postgres
  postgres --> dbvolume
  api --> uploadvolume
```

```mermaid
flowchart LR
  postgres[PostgreSQL inicia] --> dbhealth{Banco saudável?}
  dbhealth -->|sim| migrate[Aplica migrations]
  migrate --> seed{Seed habilitado?}
  seed -->|sim| runseed[Cria/atualiza dados locais]
  seed -->|não| api[Inicia API]
  runseed --> api
  api --> apihealth{API saudável?}
  apihealth -->|sim| web[Inicia Nginx / SPA]
```

## 9. Estado atual e evolução prevista

```mermaid
flowchart LR
  subgraph current[Implementado]
    authentication[Autenticação JWT]
    tenancy[Multi-company]
    structure[Departments e Boards]
    kanban[Kanban e Tasks]
    scoped[Permissões por escopo]
    requests[Access Requests]
    collaboration[Comments, Watchers,<br/>Activities e Attachments]
    epicsData[Modelo de Epics]
  end

  subgraph future[Direção arquitetural]
    events[Domain events]
    notifications[Notifications]
    audit[Audit log]
    realtime[Realtime]
    automation[Automações]
    externalStorage[Storage externo]
  end

  kanban -. TaskCreated / TaskMoved .-> events
  collaboration -. CommentCreated .-> events
  events --> notifications
  events --> audit
  events --> realtime
  events --> automation
  collaboration -. evolução .-> externalStorage
```

> “Direção arquitetural” representa intenções documentadas e não funcionalidade disponível.

## 10. Fontes de verdade

- Estrutura geral: `docs/architecture.md`
- Modelo de dados: `apps/api/prisma/schema.prisma`
- API: `apps/api/src/app.ts` e `apps/api/src/http/routes/`
- Frontend: `apps/web/src/App.tsx`, `apps/web/src/hooks/` e `apps/web/src/components/`
- Permissões: `docs/permissions.md`, `apps/api/src/permissions.ts` e
  `apps/api/src/scoped-permissions.ts`
- Deployment: `Dockerfile` e `docker-compose.yml`
