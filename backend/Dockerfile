# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie de TOUS les fichiers de configuration
COPY backend/package.json backend/pnpm-lock.yaml* backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile --prefer-offline

# Installation des dépendances de développement manquantes
RUN pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Copie de TOUT le code source (y compris les dossiers référencés)
COPY backend/ ./

# Construction avec skipLibCheck
RUN npx nest build --tsc-skip-lib-check

# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=10000

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

COPY backend/package.json backend/pnpm-lock.yaml* ./

RUN pnpm install --prod --frozen-lockfile --prefer-offline

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads /app/logs && \
    chown -R node:node /app

USER node

EXPOSE $PORT

CMD ["node", "dist/main.js"]