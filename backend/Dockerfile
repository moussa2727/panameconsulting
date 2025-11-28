# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY backend/package.json backend/pnpm-lock.yaml* backend/tsconfig.json backend/nest-cli.json ./

# Installation des dépendances (suppression du store prune)
RUN pnpm install --frozen-lockfile --prefer-offline && \
    pnpm i --save-dev @types/eslint__js

# Copie des sources de l'application
COPY backend/src/ ./src/

# Construction de l'application
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