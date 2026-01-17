# Single stage Dockerfile
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the shared package
COPY packages/shared ./packages/shared

# Copy the api package
COPY apps/api ./apps/api

# Install all dependencies, skip lifecycle scripts (husky)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build the shared package first (api depends on it)
WORKDIR /app/packages/shared
RUN pnpm build

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm prisma:generate

# Build the TypeScript application
RUN pnpm build

# Expose the port (app listens on 4000)
EXPOSE 4000

# Run the application
CMD ["node", "dist/index.js"]
