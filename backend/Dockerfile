# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration pour optimiser le cache Docker
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Installation des dépendances avec cache optimisé
RUN pnpm install --frozen-lockfile --prefer-offline

# Copie des sources
COPY . .

# Construction de l'application avec cache sécurisé
RUN pnpm run build

# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine AS production

# Arguments de build
ARG NODE_ENV=production
ARG PORT=3000
ARG APP_VERSION=1.0.0

# Variables d'environnement
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV HOSTNAME=0.0.0.0
ENV APP_VERSION=${APP_VERSION}
ENV TZ=Europe/Paris

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Installation des dépendances système recommandées
RUN apk add --no-cache \
    tzdata \
    curl \
    && cp /usr/share/zoneinfo/Europe/Paris /etc/localtime \
    && echo "Europe/Paris" > /etc/timezone \
    && apk del tzdata

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de package
COPY package.json pnpm-lock.yaml* ./

# Installation UNIQUEMENT des dépendances de production avec cache optimisé
RUN pnpm install --prod --frozen-lockfile --prefer-offline --shamefully-hoist

# Copie des fichiers compilés depuis l'étape builder
COPY --from=builder /app/dist ./dist

# Copie des fichiers de configuration essentiels
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/nest-cli.json ./

# Création des dossiers nécessaires avec permissions appropriées
RUN mkdir -p /app/uploads /app/logs /app/temp

# ============ SÉCURITÉ ============
# Création d'un utilisateur non-root pour plus de sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app

# Nettoyage des caches et fichiers temporaires
RUN pnpm store prune && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Passage à l'utilisateur non-root
USER nestjs

# Exposition du port de l'application
EXPOSE ${PORT}

# Commande de démarrage de l'application
CMD ["node", "dist/main.js"]