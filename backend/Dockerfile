# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie des fichiers de configuration DEPUIS LE DOSSIER COURANT
COPY package.json pnpm-lock.yaml* tsconfig.json nest-cli.json ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile --prefer-offline

# Copie des sources
COPY backend/src/ ./src/

# Construction de l'application
RUN pnpm run build

# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=10000

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --prod --frozen-lockfile --prefer-offline

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads && \
    mkdir -p /app/logs && \
    chown -R node:node /app

USER node

EXPOSE $PORT

CMD ["node", "dist/main.js"]