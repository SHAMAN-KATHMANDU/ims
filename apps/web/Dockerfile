# Base image
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for all workspaces
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
# Use --no-frozen-lockfile to allow pnpm to resolve platform-specific optional dependencies
# Increase network concurrency for faster downloads
RUN pnpm config set network-concurrency 16 && \
    pnpm install --no-frozen-lockfile

# Fix lightningcss Linux binary - CRITICAL for Tailwind CSS v4
RUN set -e; \
    echo "=== Fixing lightningcss Linux binary ==="; \
    LIGHTNINGCSS_DIR=$(find node_modules/.pnpm -type d -path "*/lightningcss@*/node_modules/lightningcss" 2>/dev/null | head -1); \
    if [ -z "$LIGHTNINGCSS_DIR" ]; then \
    echo "ERROR: lightningcss not found"; \
    exit 1; \
    fi; \
    echo "Found lightningcss at: $LIGHTNINGCSS_DIR"; \
    cd "$LIGHTNINGCSS_DIR"; \
    if [ ! -f "lightningcss.linux-x64-gnu.node" ]; then \
    echo "Installing lightningcss-linux-x64-gnu..."; \
    npm install --no-save --no-package-lock --no-audit lightningcss-linux-x64-gnu@1.30.2; \
    if [ -d "node_modules/lightningcss-linux-x64-gnu" ]; then \
    find node_modules/lightningcss-linux-x64-gnu -name "*.node" -type f -exec cp {} ./lightningcss.linux-x64-gnu.node \; && \
    echo "✓ Binary copied from npm package"; \
    elif [ -f "node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node" ]; then \
    cp node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node ./lightningcss.linux-x64-gnu.node && \
    echo "✓ Binary copied"; \
    else \
    echo "Downloading binary directly from npm registry..."; \
    curl -sL "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.30.2.tgz" -o /tmp/binary.tgz && \
    mkdir -p /tmp/binary && \
    tar -xzf /tmp/binary.tgz -C /tmp/binary && \
    find /tmp/binary -name "*.node" -type f -exec cp {} ./lightningcss.linux-x64-gnu.node \; && \
    rm -rf /tmp/binary /tmp/binary.tgz && \
    echo "✓ Binary downloaded and extracted"; \
    fi; \
    fi; \
    if [ -f "lightningcss.linux-x64-gnu.node" ]; then \
    echo "✓ SUCCESS: lightningcss binary verified"; \
    ls -lh lightningcss.linux-x64-gnu.node; \
    else \
    echo "✗ ERROR: Failed to install lightningcss binary"; \
    exit 1; \
    fi

# Copy application source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "--filter", "web", "dev"]
