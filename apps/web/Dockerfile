# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install system dependencies needed for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for required workspaces only
COPY apps/web/package.json ./apps/web/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/blocks/package.json ./packages/blocks/

# Install dependencies (frozen lockfile for reproducibility)
# Note: --ignore-scripts is intentionally omitted so pnpm properly links
# workspace packages (e.g. next binary in apps/web/node_modules)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy source code first, then overlay node_modules from deps stage so the
# COPY . . (which excludes node_modules via .dockerignore) does not wipe them.
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Accept NEXT_PUBLIC_API_URL as a build arg so it gets baked into the JS bundle.
# Pass via:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://...
#               --build-arg NEXT_PUBLIC_APP_ENV=staging
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}
ARG NEXT_PUBLIC_FEATURE_FLAGS
ENV NEXT_PUBLIC_FEATURE_FLAGS=${NEXT_PUBLIC_FEATURE_FLAGS}
ARG NEXT_PUBLIC_TENANT_SITE_URL
ENV NEXT_PUBLIC_TENANT_SITE_URL=${NEXT_PUBLIC_TENANT_SITE_URL}

# Build the shared and blocks packages first (web depends on both)
RUN pnpm --filter @repo/shared build
RUN pnpm --filter @repo/blocks build

# Build the Next.js app.
# --mount=type=cache persists the Next.js incremental compiler cache on the
# runner's local disk across builds, cutting cold-compile time dramatically.
RUN --mount=type=cache,id=nextjs-web-build-cache,target=/app/apps/web/.next/cache \
    pnpm --filter web build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only necessary files from builder
# Next.js standalone output includes everything needed to run
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname to listen on all interfaces
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the production server
# The standalone output creates a server.js in the app directory
CMD ["node", "apps/web/server.js"]
