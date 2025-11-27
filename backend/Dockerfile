# ============ BUILD ============  
FROM node:18-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* tsconfig.json nest-cli.json ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY src/ ./src/
RUN pnpm build


# ============ PRODUCTION ============  
FROM node:18-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads /app/logs

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 10000
ENV PORT=10000 HOSTNAME=0.0.0.0

CMD ["node", "dist/main.js"]