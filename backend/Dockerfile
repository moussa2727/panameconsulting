# Dockerfile
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/logs ./logs

# Create necessary directories
RUN mkdir -p logs uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]