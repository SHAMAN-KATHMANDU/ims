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
RUN npm install -g pnpm@8.14.1
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
# Create uploads directory for multer and give ownership to nestjs
RUN mkdir -p /app/uploads && chown -R nestjs:nestjs /app/uploads

USER nestjs
COPY --from=installer /app .
# Tag the final image
LABEL stage="final"
RUN docker rmi $(docker images -f "label=stage=intermediate" -q) || true
CMD node apps/api/dist/index.js