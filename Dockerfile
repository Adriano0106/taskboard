FROM node:22-alpine AS dependencies

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM dependencies AS api-build

COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN npm run prisma:generate && npm run build --workspace @taskboard/api

FROM node:22-alpine AS api

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=api-build /app/package.json /app/package-lock.json ./
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/apps/api/package.json ./apps/api/package.json
COPY --from=api-build /app/apps/api/dist ./apps/api/dist
COPY --from=api-build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && if [ \"$SEED_DATABASE\" = \"true\" ]; then npm run prisma:seed --workspace @taskboard/api; fi && node apps/api/dist/server.js"]

FROM dependencies AS web-build

ARG VITE_API_URL=http://localhost:3333
ENV VITE_API_URL=$VITE_API_URL

COPY tsconfig.base.json ./
COPY apps/web ./apps/web
RUN npm run build --workspace @taskboard/web

FROM nginx:1.27-alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
