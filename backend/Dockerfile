# Dockerfile multi-stage optimisé pour pnpm
FROM node:18-alpine AS installer

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /usr/src/app

# Copier les fichiers de configuration
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Installer toutes les dépendances
RUN pnpm install --frozen-lockfile

FROM installer AS builder

COPY . .

# Build de l'application
RUN pnpm run build

# Étape de production finale
FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /usr/src/app

# Copier package.json et lockfile
COPY package.json pnpm-lock.yaml* ./

# Installer uniquement les dépendances de production
RUN pnpm install --frozen-lockfile --prod

# Copier le build depuis l'étape builder
COPY --from=builder /usr/src/app/dist ./dist

# Sécurité : utiliser un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /usr/src/app

USER nextjs

CMD ["node", "dist/main"]