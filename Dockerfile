# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && corepack prepare pnpm@8.14.1 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


FROM base AS dependencies

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile


FROM dependencies AS build

ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm run build


FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile


FROM base AS migrate

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json prisma.config.ts ./
COPY prisma ./prisma

CMD ["pnpm", "prisma:deploy"]


FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=4600

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN mkdir -p /app/storage/documents \
    && chown -R node:node /app

USER node

EXPOSE 4600

CMD ["node", "dist/presentation/server.js"]