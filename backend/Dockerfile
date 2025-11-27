# Dockerfile
# ==========
# Builder stage
# ==========
FROM node:18-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml .npmrc ./

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads

# Set build-time environment variables
ARG NODE_ENV=production
ARG BUILD_VERSION=1.0.0

# Build the application
RUN pnpm run build

# ==========
# Production stage
# ==========
FROM node:18-alpine AS production

# Security best practices
RUN apk add --no-cache curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install pnpm globally
RUN npm install -g pnpm@8.15.0 && \
    npm cache clean --force

WORKDIR /app

# Switch to non-root user
USER nextjs

# Copy package files
COPY --chown=nextjs:nodejs package.json pnpm-lock.yaml .npmrc ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile --prefer-offline && \
    pnpm store prune

# Copy built application from builder stage
COPY --chown=nextjs:nodejs --from=builder /app/dist ./dist
COPY --chown=nextjs:nodejs --from=builder /app/uploads ./uploads
COPY --chown=nextjs:nodejs --from=builder /app/logs ./logs
COPY --chown=nextjs:nodejs --from=builder /app/package.json ./

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads && \
    chown -R nextjs:nodejs logs uploads


# Runtime environment variables
ENV NODE_ENV=production
ENV PORT=10000
ENV TZ=Europe/Paris

# Expose port
EXPOSE 10000

# Use node process instead of npm for better signal handling
CMD ["node", "dist/main.js"]