# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml* tsconfig.json nest-cli.json ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile --prefer-offline

# Copie des sources
COPY src/ ./src/

# Construction
RUN pnpm run build

# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=10000

# Installation pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie des fichiers essentiels
COPY package.json pnpm-lock.yaml* ./
COPY --from=builder /app/dist ./dist

# Installation production
RUN pnpm install --prod --frozen-lockfile --prefer-offline

# Création dossiers
RUN mkdir -p uploads logs

# Utilisateur non-root
USER node

# Exposition port
EXPOSE 10000

# Commande simple
CMD ["node", "dist/main.js"]