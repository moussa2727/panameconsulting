# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
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

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de package
COPY package.json pnpm-lock.yaml* ./

# Installation UNIQUEMENT des dépendances de production
RUN pnpm install --prod --frozen-lockfile --prefer-offline

# Copie des fichiers compilés depuis l'étape builder
COPY --from=builder /app/dist ./dist

# Création des dossiers nécessaires
RUN mkdir -p /app/uploads && \
    mkdir -p /app/logs && \
    chown -R node:node /app

# Passage à l'utilisateur non-root (sécurité)
USER node

# Exposition du port (Railway fournit le port via variable d'environnement)
EXPOSE $PORT

# Commande de démarrage de l'application
CMD ["node", "dist/main.js"]