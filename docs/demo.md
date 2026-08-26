# TaskBoard — Demo para portfólio

O modo demo entrega somente arquivos estáticos. Ele não inicia Fastify, Prisma ou PostgreSQL e,
portanto, não exige backend nem banco de dados hospedados.

## Comportamento

- abre automaticamente com um usuário `OWNER` de demonstração;
- mantém os mesmos componentes, hooks e contratos usados pela aplicação real;
- simula as operações da API dentro do navegador;
- persiste alterações no `localStorage` de cada visitante;
- permite restaurar o cenário inicial pelo banner “Modo demonstração”;
- não compartilha dados entre visitantes;
- não envia dados para um servidor.

O cenário inicial contém a empresa **Adri Corp**, cinco usuários, dois departamentos, dois boards
e tasks distribuídas pelo Kanban.

## Desenvolvimento

```bash
npm run dev:demo
```

## Validação

```bash
npm run validate:demo --workspace @taskboard/web
npm run build:demo
```

## Publicação estática

Execute:

```bash
npm run build:demo
```

Publique o conteúdo de `apps/web/dist/` em qualquer hospedagem estática. O arquivo
`apps/web/public/_redirects` é copiado para o build e configura fallback para `index.html` em
hosts compatíveis, preservando as URLs amigáveis da SPA.

Configuração típica do provedor:

| Campo | Valor |
| --- | --- |
| Root/base directory | repositório |
| Build command | `npm ci && npm run build:demo` |
| Publish directory | `apps/web/dist` |

Para uma hospedagem que não reconheça `_redirects`, configure todas as rotas para responderem
com `apps/web/dist/index.html`.

## Vercel

O arquivo `vercel.json` na raiz configura automaticamente:

- framework Vite;
- build `npm run build:demo`;
- publicação de `apps/web/dist`;
- rewrite de todas as URLs amigáveis para a SPA.

Fluxo manual pela CLI:

```bash
npx vercel
npx vercel --prod
```

## Separação da aplicação real

`VITE_DEMO_MODE=true` existe apenas em `apps/web/.env.demo` e é ativado pelo modo `demo` do
Vite. Os comandos normais `npm run dev`, `npm run build` e o Docker Compose continuam usando a
API e o PostgreSQL reais.
