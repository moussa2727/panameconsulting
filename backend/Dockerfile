# Dockerfile simplifié pour pnpm
FROM node:18-alpine AS base

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /usr/src/app

# Copier package.json d'abord (pour mieux utiliser le cache Docker)
COPY package.json ./

# Copier les autres fichiers de configuration si ils existent
COPY pnpm-lock.yaml ./
COPY .npmrc ./

FROM base AS development

# Copier d'abord les fichiers de dépendances
COPY package.json pnpm-lock.yaml* ./

# Installer les dépendances
RUN pnpm install --frozen-lockfile

# Copier le reste du code
COPY . .

# Build
RUN pnpm run build

FROM base AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Installer les dépendances de production
RUN pnpm install --frozen-lockfile --prod

# Copier les fichiers built
COPY --from=development /usr/src/app/dist ./dist

# Sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 && \
    chown -R appuser:nodejs /usr/src/app

USER appuser

CMD ["node", "dist/main"]