# =============================================================================
# apps/tenant-site — multi-stage Docker build
# Mirrors the apps/web Dockerfile pattern: pnpm deps → next build → standalone.
# =============================================================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- dependencies ----
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/blocks/package.json packages/blocks/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/tenant-site/package.json apps/tenant-site/
RUN pnpm install --frozen-lockfile --filter tenant-site...

# ---- build ----
FROM deps AS builder
COPY packages/shared packages/shared
COPY packages/blocks packages/blocks
COPY packages/typescript-config packages/typescript-config
COPY packages/eslint-config packages/eslint-config
COPY apps/tenant-site apps/tenant-site
RUN pnpm --filter @repo/shared build
RUN pnpm --filter @repo/blocks build
RUN pnpm --filter tenant-site build

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3100 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output contains a minimal server + node_modules subset
COPY --from=builder --chown=nextjs:nodejs /repo/apps/tenant-site/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/tenant-site/.next/static ./apps/tenant-site/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/tenant-site/public ./apps/tenant-site/public

USER nextjs
EXPOSE 3100

# Standalone server lives at apps/tenant-site/server.js inside the bundle
CMD ["node", "apps/tenant-site/server.js"]
