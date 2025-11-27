FROM node:18-alpine AS builder

WORKDIR /app

# Copy only dependency files first for caching
COPY package.json ./

# Check if pnpm-lock.yaml exists and copy it if present
COPY pnpm-lock.yaml* ./

# Enable Corepack and install dependencies
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Install dependencies (will use package-lock.json if pnpm-lock.yaml doesn't exist)
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm install --frozen-lockfile --prefer-offline; \
    else \
        echo "pnpm-lock.yaml not found, using regular install" && \
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

# Create runtime directories
RUN mkdir -p /app/uploads /app/logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 10000

CMD ["node", "dist/main.js"]