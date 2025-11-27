FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "dist/main"]