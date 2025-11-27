# Dockerfile (Version simplifiée)
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml* ./
COPY .npmrc* ./

# Install dependencies
RUN pnpm install --prefer-offline

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production image
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies
RUN npm install --production --prefer-offline

# Copy built application
COPY --from=builder /app/dist ./dist

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 10000

CMD ["node", "dist/main.js"]