# Dockerfile optimisé pour pnpm
FROM node:18-alpine AS base

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Étape de développement
FROM base AS development

# Définir les variables d'environnement
ENV NODE_ENV=development

# Copier les fichiers de configuration
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Installer toutes les dépendances
RUN pnpm install --frozen-lockfile

# Copier le code source
COPY . .

# Exposer le port (ajuster selon votre application)
EXPOSE 3000

# Commande pour le développement
CMD ["pnpm", "run", "dev"]

# Étape de construction
FROM base AS builder

# Définir les variables d'environnement
ENV NODE_ENV=production

# Copier les fichiers de configuration
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Installer toutes les dépendances
RUN pnpm install --frozen-lockfile --prod=false

# Copier le code source
COPY . .

# Construire l'application
RUN pnpm run build

# Étape de production
FROM node:18-alpine AS production

# Installer pnpm pour la production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Définir les variables d'environnement
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV} \
    PORT=3000

# Créer l'utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de configuration
COPY package.json pnpm-lock.yaml* ./

# Changer les propriétaires des fichiers
RUN chown -R nextjs:nodejs /usr/src/app

# Passer à l'utilisateur non-root
USER nextjs

# Installer uniquement les dépendances de production
RUN pnpm install --frozen-lockfile --prod

# Copier les fichiers construits depuis l'étape builder
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/dist ./dist

# Exposer le port
EXPOSE 10000

# Commande de démarrage
CMD ["node", "dist/main"]