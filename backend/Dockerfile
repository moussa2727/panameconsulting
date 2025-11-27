# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine AS production

# Arguments de build
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Installation et configuration de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de package avec vérification
COPY package.json ./
COPY pnpm-lock.yaml* ./

# Vérification que les fichiers existent
RUN test -f package.json || (echo "package.json not found!" && exit 1)
RUN test -f pnpm-lock.yaml || test -f pnpm-lock.yml || (echo "pnpm-lock file not found!" && exit 1)

# Installation UNIQUEMENT des dépendances de production
RUN pnpm install --prod --frozen-lockfile --prefer-offline

# Copie des fichiers compilés depuis l'étape builder
COPY --from=builder /app/dist ./dist
# Création des dossiers nécessaires
RUN mkdir -p /app/uploads && \
    mkdir -p /app/logs

# ============ SÉCURITÉ ============
# Création d'un utilisateur non-root pour plus de sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# Passage à l'utilisateur non-root
USER nestjs

# Exposition du port de l'application
EXPOSE 10000

# Variables d'environnement par défaut
ENV PORT=10000
ENV HOSTNAME=0.0.0.0

# Commande de démarrage de l'application
CMD ["node", "dist/main.js"]