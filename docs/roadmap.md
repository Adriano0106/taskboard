# TaskBoard Roadmap

Este documento registra as proximas implementacoes planejadas e evita que o
planejamento do produto fique apenas no historico das conversas.

## Proximas implementacoes

### 1. Diretorio de quadros acessiveis (em andamento)

- Fazer o logo `TaskBoard` abrir a pagina inicial da empresa, sem escolher um
  quadro automaticamente.
- Exibir os quadros agrupados por departamento e permitir acesso por card.
- Separar a visao `Meus quadros` das configuracoes administrativas da empresa.
- Garantir no backend que cada usuario receba somente departamentos e quadros
  cobertos por suas permissoes efetivas.

### 2. Tela dedicada da task (implementada)

- Criar uma pagina propria para as rotas de task existentes.
- Exibir somente a barra superior padrao da aplicacao e o conteudo da task, sem
  renderizar o board ao fundo.
- Mostrar identificador, titulo, descricao, prioridade, responsavel, anexos,
  comentarios, observadores e historico de atualizacoes.
- Adicionar um select de status baseado nas colunas do board.
- Ao trocar o status, mover a task para a coluna selecionada respeitando as
  permissoes efetivas do usuario.
- Manter a tela em modo somente leitura para usuarios `VIEWER`.
- Preservar as URLs amigaveis no formato
  `/:companySlug/:departmentKey/:boardKey/:taskFriendlyId`.

### 3. Consolidacao do historico de atualizacoes (em andamento)

O historico basico ja esta implementado por meio de atividades da task. A
proxima etapa deve consolidar sua apresentacao na tela dedicada e garantir que
as principais alteracoes gerem entradas consistentes.

- Exibir autor, data, tipo da alteracao e valores anterior/novo quando
  aplicavel.
- Cobrir criacao, movimentacao/status, titulo, descricao, prioridade,
  responsavel, comentarios, anexos e observadores.
- Avaliar paginacao quando o volume de atividades crescer.
- Manter o historico imutavel e visivel apenas para usuarios com acesso a task.

### 4. Epicos

- Implementar repositories, permissoes, endpoints e testes para `Epic` e
  `EpicTaskLink`, cujos modelos ja existem no banco.
- Criar telas para CRUD de epicos e vinculo de tasks de diferentes boards.
- Respeitar a visibilidade por departamento e board.

### 5. Notificacoes internas

- Criar notificacoes in-app orientadas a eventos.
- Cobrir inicialmente atribuicao de task, comentarios, solicitacoes de acesso e
  vinculos com epicos.
- Permitir listar notificacoes e marca-las como lidas.

### 6. Metadados de tasks

- Adicionar tipo da task, prazo e, posteriormente, estimativas e labels.
- Exibir os metadados relevantes nos cards e na tela dedicada.

### 7. Criacao de task com recursos complementares

- Permitir adicionar anexos, comentarios e observadores durante o fluxo de
  criacao, depois que a task base for persistida.

### 8. Eventos de dominio e auditoria

- Introduzir eventos internos para desacoplar atividades, notificacoes,
  auditoria e futuras integracoes em tempo real.
- Evoluir para um `AuditLog` corporativo separado do historico funcional da
  task.

### 9. Testes do frontend e CI

- Adicionar testes para routing, hooks, permissoes e fluxos criticos da UI.
- Automatizar lint, build e testes no pipeline de integracao continua.

## Proxima fatia recomendada

Implementar primeiro a tela dedicada da task reutilizando os endpoints, hooks e
componentes de detalhe existentes. A troca de status deve reutilizar a operacao
de movimentacao da task, sem criar uma segunda regra de persistencia.
