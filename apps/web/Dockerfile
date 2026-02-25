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

# Install dependencies (frozen lockfile for reproducibility)
# --ignore-scripts skips prepare script (husky) which isn't needed in Docker
RUN pnpm install --frozen-lockfile --ignore-scripts

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Accept NEXT_PUBLIC_API_URL as a build arg so it gets baked into the JS bundle.
# Pass via: docker build --build-arg NEXT_PUBLIC_API_URL=https://...
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the shared package first (web depends on it)
RUN pnpm --filter @repo/shared build

# Build the Next.js app
RUN pnpm --filter web build

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
