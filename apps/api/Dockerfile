# ============================================
# Stage 1: Builder - Install dependencies and build
# ============================================
FROM node:20-alpine AS builder

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

# Generate Prisma client and build API
WORKDIR /app/apps/api
RUN pnpm prisma:generate
RUN pnpm build

# ============================================
# Stage 2: Runner - Production image (minimal)
# ============================================
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl

# Install pnpm (needed for workspace resolution)
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy shared package (only dist and package.json)
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy API package (only what's needed to run)
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema, migrations, and seed script
COPY --from=builder /app/apps/api/prisma/schema.prisma ./apps/api/prisma/
COPY --from=builder /app/apps/api/prisma/migrations ./apps/api/prisma/migrations
COPY --from=builder /app/apps/api/prisma/seed.ts ./apps/api/prisma/
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/

# Copy node_modules (includes generated Prisma client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy entrypoint script
COPY apps/api/docker-entrypoint.sh /app/apps/api/
RUN chmod +x /app/apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api

# Expose the port (app listens on 4000)
EXPOSE 4000

# Run migrations then start the application
ENTRYPOINT ["./docker-entrypoint.sh"]
