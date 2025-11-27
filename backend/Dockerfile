FROM node:18-alpine

WORKDIR /app

# Enable Corepack & PNPM
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY package.json pnpm-lock.yaml* ./
COPY tsconfig*.json ./
COPY nest-cli.json ./    

RUN pnpm install

COPY . .

RUN pnpm build

CMD ["node", "dist/main.js"]
