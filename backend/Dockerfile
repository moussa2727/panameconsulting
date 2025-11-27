FROM node:18-alpine

# Installation de pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# Copie des sources
COPY . .

# Construction de l'application
RUN pnpm run build

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=10000
ENV HOSTNAME=0.0.0.0
ENV TZ=Europe/Paris

# Exposition du port
EXPOSE 10000

# Commande de démarrage
CMD ["node", "dist/main.js"]