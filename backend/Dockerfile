# ============ BUILD STAGE ============
FROM node:18-alpine AS builder

# Enable Corepack and set pnpm version
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy dependency files first for caching
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy the rest of the source code
COPY . .

# Build the NestJS app
RUN pnpm build

# ============ PRODUCTION STAGE ============
FROM node:18-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
ENV HOSTNAME=0.0.0.0

# Copy only what's needed
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create runtime directories (Railway volumes will be mounted here)
RUN mkdir -p /app/uploads /app/logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose the port
EXPOSE 10000

# Start the app
CMD ["node", "dist/main.js"]
