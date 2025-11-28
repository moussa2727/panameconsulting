# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie des fichiers de configuration
COPY backend/package.json backend/pnpm-lock.yaml* backend/tsconfig.json backend/nest-cli.json ./

# Installation et nettoyage des dépendances
RUN pnpm install --frozen-lockfile --prefer-offline

# Tentative de résolution des types manquants
RUN pnpm ls @types/eslint__js 2>/dev/null || pnpm add -D @types/eslint@latest
RUN pnpm ls eslint 2>/dev/null || pnpm add -D eslint@latest

# Alternative: si le package n'existe pas, installer eslint directement
RUN pnpm add -D eslint @types/eslint__js || \
    pnpm add -D @eslint/js || \
    echo "Tentative d'installation des types eslint échouée, continuation..."

# Copie des sources
COPY backend/src/ ./src

# Construction
RUN pnpm run build

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