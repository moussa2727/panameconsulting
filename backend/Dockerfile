# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration DEPUIS LE DOSSIER BACKEND
COPY backend/package.json backend/pnpm-lock.yaml* backend/tsconfig.json backend/nest-cli.json ./

# Installation de toutes les dépendances
RUN pnpm install --frozen-lockfile --prefer-offline

# Copie des sources de l'application
COPY backend/src/ ./src/

# Construction de l'application
RUN pnpm run build

# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine AS production

# Arguments de build
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=10000

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de package DEPUIS LE DOSSIER BACKEND
COPY backend/package.json backend/pnpm-lock.yaml* ./

# Installation UNIQUEMENT des dépendances de production
RUN pnpm install --prod --frozen-lockfile --prefer-offline

# Copie des fichiers compilés depuis l'étape builder
COPY --from=builder /app/dist ./dist

# Création des dossiers nécessaires
RUN mkdir -p /app/uploads && \
    mkdir -p /app/logs && \
    chown -R node:node /app

# Script de vérification des variables d'environnement (pour debug)
RUN echo "🔍 Vérification des variables d'environnement..." && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "PORT: $PORT"

# Passage à l'utilisateur non-root
USER node

# Exposition du port (Railway injecte le port via $PORT)
EXPOSE $PORT

# Commande de démarrage avec gestion d'erreur
CMD ["node", "dist/main.js"]