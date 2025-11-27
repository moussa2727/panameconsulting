# Dockerfile optimisé pour pnpm
FROM node:18-alpine AS base

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Définir les variables d'environnement pour pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copier les fichiers de configuration
COPY package.json pnpm-lock.yaml* .npmrc* ./

FROM base AS development

# Installer toutes les dépendances (développement inclus)
RUN pnpm install --frozen-lockfile

COPY . .

# Build de l'application
RUN pnpm run build

FROM base AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Installer uniquement les dépendances de production
RUN pnpm install --frozen-lockfile --prod

# Copier le build depuis l'étape development
COPY --from=development /usr/src/app/dist ./dist

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer les permissions du répertoire de travail
RUN chown -R nextjs:nodejs /usr/src/app
USER nextjs

# Utiliser node au lieu de pnpm pour l'exécution en production
CMD ["node", "dist/main"]