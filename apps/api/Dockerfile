FROM node:20-alpine AS base

# The web Dockerfile is copy-pasted into our main docs at /docs/handbook/deploying-with-docker.
# Make sure you update this Dockerfile, the Dockerfile in the web workspace and copy that over to Dockerfile in the docs.

FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update
RUN apk add --no-cache libc6-compat openssl
# Set working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune api --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@9.0.0
WORKDIR /app


# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN pnpm install 
COPY --from=builder /app/out/full/ .

# Generate Prisma client
RUN pnpm --filter api prisma:generate

# Build the app
RUN pnpm turbo build

# Clean up source files only (keep node_modules with Prisma client)
RUN find apps/api -type f \
    -not -path 'apps/api/dist/*' \
    -not -path 'apps/api/prisma/*' \
    -not -path 'apps/api/node_modules/*' \
    -not -name 'package.json' \
    -delete && rm -rf apps/api/test apps/api/src

# Remove dev-only packages from node_modules to reduce size
RUN pnpm prune --prod && pnpm store prune


FROM base AS runner
RUN apk update && apk add --no-cache openssl
WORKDIR /app


# Don't run production as root
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# Create log directory and set permissions
RUN mkdir -p /app/.log && chmod -R 777 /app/.log

COPY --from=installer /app .
# Entrypoint runs migrations on every start (e.g. after Watchtower updates)
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create uploads dir where multer expects it (process.cwd() = /app/apps/api)
RUN mkdir -p /app/apps/api/uploads/attachments && chown -R nestjs:nestjs /app/apps/api/uploads

USER nestjs
CMD ["/app/docker-entrypoint.sh"]