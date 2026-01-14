# Base image
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Prisma and native modules
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Configure pnpm for Linux binaries and faster downloads
RUN pnpm config set supportedArchitectures.os "linux" && \
    pnpm config set supportedArchitectures.cpu "x64" && \
    pnpm config set network-concurrency 16

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for all workspaces
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application source code
COPY . .

# Generate Prisma client from the api directory
WORKDIR /app/apps/api
RUN npx prisma generate

# Build TypeScript for production
WORKDIR /app
RUN pnpm --filter api... build

# Expose port
EXPOSE 4000

# Start production server
CMD ["pnpm", "--filter", "api", "start"]
