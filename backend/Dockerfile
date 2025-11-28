# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie des fichiers de configuration
COPY backend/package.json backend/pnpm-lock.yaml* ./
COPY backend/*.json ./

# Installation de toutes les dépendances (y compris devDependencies)
RUN pnpm install --frozen-lockfile --prefer-offline

# Installation explicite des types ESLint si nécessaire
RUN pnpm add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint || true

# Copie des sources
COPY backend/src/ ./src/

# Construction avec skipLibCheck
RUN npx tsc -p tsconfig.json --skipLibCheck

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

RUN mkdir -p /app/uploads && \
    mkdir -p /app/logs && \
    chown -R node:node /app

USER node
EXPOSE $PORT
CMD ["node", "dist/main.js"]