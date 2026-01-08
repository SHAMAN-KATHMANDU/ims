#!/bin/sh
set -e

echo "=== Web Container Entrypoint ==="
echo "Checking lightningcss binary..."

# Function to fix lightningcss binary
fix_lightningcss() {
    LIGHTNINGCSS_DIR=$(find /app/node_modules/.pnpm -type d -path "*/lightningcss@*/node_modules/lightningcss" 2>/dev/null | head -1)
    
    if [ -z "$LIGHTNINGCSS_DIR" ]; then
        echo "ERROR: lightningcss directory not found in node_modules"
        echo "Searching for lightningcss packages..."
        find /app/node_modules/.pnpm -name "*lightningcss*" -type d 2>/dev/null | head -10 || true
        return 1
    fi
    
    echo "Found lightningcss at: $LIGHTNINGCSS_DIR"
    
    # Check if binary already exists
    if [ -f "$LIGHTNINGCSS_DIR/lightningcss.linux-x64-gnu.node" ]; then
        echo "✓ lightningcss binary already exists"
        ls -lh "$LIGHTNINGCSS_DIR/lightningcss.linux-x64-gnu.node"
        return 0
    fi
    
    echo "⚠ Binary missing, installing..."
    cd "$LIGHTNINGCSS_DIR" || return 1
    
    # Method 1: Install via npm in the lightningcss directory
    echo "Attempting npm install..."
    npm install --no-save --no-package-lock --no-audit --prefer-offline lightningcss-linux-x64-gnu@1.30.2 2>&1 | grep -v "npm WARN" || true
    
    # Check if it was installed
    if [ -d "node_modules/lightningcss-linux-x64-gnu" ]; then
        BINARY=$(find node_modules/lightningcss-linux-x64-gnu -name "*.node" -type f 2>/dev/null | head -1)
        if [ -n "$BINARY" ] && [ -f "$BINARY" ]; then
            cp "$BINARY" ./lightningcss.linux-x64-gnu.node
            echo "✓ Binary copied from npm package"
        fi
    fi
    
    # Method 2: If still not found, try to find it elsewhere and copy
    if [ ! -f "lightningcss.linux-x64-gnu.node" ]; then
        echo "Searching for binary in other locations..."
        FOUND_BINARY=$(find /app/node_modules/.pnpm -name "lightningcss.linux-x64-gnu.node" -type f 2>/dev/null | head -1)
        if [ -n "$FOUND_BINARY" ] && [ -f "$FOUND_BINARY" ]; then
            cp "$FOUND_BINARY" ./lightningcss.linux-x64-gnu.node
            echo "✓ Binary found and copied from: $FOUND_BINARY"
        fi
    fi
    
    # Method 3: Download directly from npm registry
    if [ ! -f "lightningcss.linux-x64-gnu.node" ]; then
        echo "Downloading binary directly from npm registry..."
        cd /tmp || return 1
        curl -sL "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.30.2.tgz" -o binary.tgz 2>/dev/null || return 1
        if [ -f "binary.tgz" ]; then
            mkdir -p binary
            tar -xzf binary.tgz -C binary 2>/dev/null || return 1
            NODE_FILE=$(find binary -name "*.node" -type f 2>/dev/null | head -1)
            if [ -n "$NODE_FILE" ] && [ -f "$NODE_FILE" ]; then
                cp "$NODE_FILE" "$LIGHTNINGCSS_DIR/lightningcss.linux-x64-gnu.node"
                echo "✓ Binary downloaded and copied"
            fi
            rm -rf binary binary.tgz 2>/dev/null || true
        fi
    fi
    
    # Final verification
    cd "$LIGHTNINGCSS_DIR" || return 1
    if [ -f "lightningcss.linux-x64-gnu.node" ]; then
        echo "✓ SUCCESS: lightningcss binary installed and verified"
        ls -lh lightningcss.linux-x64-gnu.node
        file lightningcss.linux-x64-gnu.node || true
        return 0
    else
        echo "✗ ERROR: Failed to install lightningcss binary"
        echo "Current directory contents:"
        ls -la . | head -20 || true
        return 1
    fi
}

# Ensure binary exists before starting (don't exit on failure, let it try to run)
if ! fix_lightningcss; then
    echo "⚠ WARNING: lightningcss binary check failed, but continuing..."
    echo "The app may fail to process CSS. Check logs for details."
fi

# Execute the command
echo "Starting Next.js development server..."
exec "$@"

