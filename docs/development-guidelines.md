# Prompt para planejamento no Codex — Projeto TaskBoard

Estamos criando o Projeto TaskBoard, uma aplicação web para gestão de tarefas, quadros Kanban e suporte corporativo.

Stack principal:

- Backend: Node.js com TypeScript
- Frontend: React com Vite e TypeScript
- ORM: Prisma
- Banco de dados: PostgreSQL
- Ambiente: Docker e Docker Compose

Objetivo da aplicação:

Criar uma plataforma multiempresa onde cada empresa pode ter departamentos, e cada departamento pode possuir um ou mais quadros. Cada quadro pode funcionar como board de tarefas, bugs, histórias, épicos ou suporte corporativo.

Estrutura conceitual:

- Company
- Department
- Board
- BoardColumn
- User
- BoardMember
- Task
- TaskComment
- TaskAttachment
- TaskActivity
- Notification
- TaskWatcher

Regras importantes:

- As colunas do quadro devem ser configuráveis por board
- Cada board pode ter nomes de colunas diferentes
- Tasks devem usar identificador amigável, como DEV-50 ou SUP-120
- O card do Kanban deve ser leve e rápido
- Detalhes completos da task devem ser carregados apenas ao abrir a task
- A movimentação dos cards deve ser fluida
- Usar atualização otimista no frontend ao mover cards
- O backend deve persistir a nova posição da task
- Cada task deve ter histórico de atividade
- Usuários devem receber notificações quando forem envolvidos em alterações relevantes
- Anexos devem ter limite inicial de 3 MB
- O sistema deve ter permissões por empresa, departamento e board

Prioridades técnicas:

1. Modelagem de banco bem feita
2. Kanban performático
3. Drag and drop fluido
4. Permissões claras
5. Notificações internas
6. Histórico de atividades
7. Código limpo e fácil de manter

Antes de implementar qualquer funcionalidade:

1. Entenda o objetivo da feature
2. Liste os arquivos que serão alterados
3. Explique a abordagem
4. Sugira a estrutura de dados quando necessário
5. Evite implementar tudo de uma vez
6. Prefira pequenas entregas incrementais
7. Não crie abstrações desnecessárias
8. Mantenha o código simples, legível e tipado

Ao gerar código:

- Usar TypeScript
- Usar nomes auto descritivos
- Evitar variáveis genéricas como i, j, data, item quando o contexto puder ser mais claro
- Usar tabulação com 2 espaços
- Não usar ponto e vírgula
- Priorizar legibilidade
- Evitar funções muito grandes
- Separar responsabilidades
- Criar tipos/interfaces quando ajudarem na manutenção
- Manter consistência entre frontend e backend
