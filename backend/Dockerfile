FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Try to copy various lock files that might exist
COPY pnpm-lock.yaml* ./
COPY package-lock.json* ./
COPY yarn.lock* ./

# Enable Corepack
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Install based on available lock file
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile --prefer-offline; \
    elif [ -f package-lock.json ]; then \
        npm ci --only=production; \
    else \
        pnpm install --prefer-offline; \
    fi

# Copy the rest of the source code
COPY . .
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