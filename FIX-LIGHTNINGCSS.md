# LightningCSS Binary Fix

## Problem
The `lightningcss.linux-x64-gnu.node` binary is missing, causing Tailwind CSS v4 to fail.

## Solution Applied
1. **Build-time fix**: Installs the binary during Docker image build
2. **Runtime fix**: Entrypoint script ensures binary exists every container start
3. **Multiple fallbacks**: npm install → search → direct download from npm registry

## How to Fix (Rebuild)

### Step 1: Stop existing containers
```bash
docker-compose -f docker-compose.dev.yml down
```

### Step 2: Rebuild the web container
```bash
docker-compose -f docker-compose.dev.yml build --no-cache web
```

### Step 3: Start services
```bash
docker-compose -f docker-compose.dev.yml up
```

### Or use the helper script:
```bash
./docker-dev.sh rebuild
```

## Verify the Fix

### Check build logs
Look for these messages during build:
```
=== Fixing lightningcss Linux binary ===
Found lightningcss at: ...
✓ SUCCESS: lightningcss binary verified
```

### Check runtime logs
When container starts, you should see:
```
=== Web Container Entrypoint ===
Checking lightningcss binary...
✓ lightningcss binary already exists
```

### Manual verification
```bash
# Enter the container
docker-compose -f docker-compose.dev.yml exec web sh

# Check if binary exists
find node_modules/.pnpm -name "lightningcss.linux-x64-gnu.node"

# Verify it's in the right place
ls -lh node_modules/.pnpm/*/node_modules/lightningcss/lightningcss.linux-x64-gnu.node
```

## If Still Failing

### Check entrypoint logs
```bash
docker-compose -f docker-compose.dev.yml logs web | grep -i lightningcss
```

### Manually trigger binary installation
```bash
# Enter container
docker-compose -f docker-compose.dev.yml exec web sh

# Run fix manually
LIGHTNINGCSS_DIR=$(find node_modules/.pnpm -type d -path "*/lightningcss@*/node_modules/lightningcss" | head -1)
cd "$LIGHTNINGCSS_DIR"
npm install --no-save lightningcss-linux-x64-gnu@1.30.2
ls -lh lightningcss.linux-x64-gnu.node
```

### Alternative: Regenerate lockfile on Linux
If the issue persists, regenerate your `pnpm-lock.yaml` on a Linux system (or in Docker) to include Linux-specific optional dependencies:

```bash
# Run in a Linux container
docker run --rm -v $(pwd):/app -w /app node:20-bullseye-slim sh -c \
  "corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm install"
```

This will update your lockfile with Linux platform entries, allowing you to use `--frozen-lockfile` safely.

