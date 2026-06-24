# Contribuindo com o TaskBoard

## Fluxo de desenvolvimento

- Faça entregas pequenas e incrementais.
- Evite commits longos que misturam assuntos diferentes.
- É obrigatório commitar durante o desenvolvimento, separando cada avanço lógico em um commit próprio.
- Não acumule várias atividades para commitar apenas no final.
- Antes de implementar uma feature, liste a abordagem e os arquivos principais afetados.
- Prefira código simples, tipado e fácil de manter.
- Não crie abstrações antes de existir repetição ou complexidade real.

## Padrão de commits

Use mensagens objetivas com um destes tipos:

- `feat`: nova funcionalidade
- `fix`: correção de bug
- `chore`: configuração, infraestrutura ou manutenção
- `docs`: documentação

Commits devem ser pequenos, frequentes e separados por contexto. Documentação, configuração, backend, frontend, testes e ajustes de manutenção devem ficar em commits diferentes sempre que forem atividades distintas.

Exemplos:

```text
docs: define regras iniciais do projeto
chore: configura monorepo typescript
feat: adiciona autenticação básica
fix: valida credenciais inválidas no login
```

## Estilo de código

- Use TypeScript em todo o projeto.
- Use UTF-8 como codificação padrão para todos os arquivos versionados.
- Use indentação com 2 espaços.
- Não use ponto e vírgula.
- Use nomes auto descritivos, mesmo que sejam mais extensos.
- Evite variáveis genéricas como `i`, `j`, `data` e `item` quando houver um nome mais claro.
- Mantenha funções curtas e com uma responsabilidade principal.
- Crie tipos e interfaces quando ajudarem a manutenção.
- Mantenha consistência entre frontend e backend.

## Validação local

Antes de abrir ou concluir uma entrega, rode:

```bash
npm run lint
npm run build
npm run test
```
