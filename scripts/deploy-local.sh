#!/usr/bin/env bash
#
# deploy-local.sh — Build and push Docker images to Docker Hub from your local machine.
# Mirrors the GitHub Actions staging workflow (build-push-staging.yml) for when CI is unavailable.
# Watchtower on the dev server polls :dev tags every 30s and auto-restarts containers.
#
# Usage:
#   ./scripts/deploy-local.sh [OPTIONS]
#
# Options:
#   --api-only    Build and push only the API image
#   --web-only    Build and push only the Web image
#   --dry-run     Build images locally but do not push to Docker Hub
#   --branch REF  Checkout this branch/ref before building (default: current branch)
#
# Required env vars:
#   DOCKERHUB_USERNAME  Docker Hub username (e.g. rpandox)
#   DOCKERHUB_TOKEN     Docker Hub access token

set -euo pipefail

# ── Colours / helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

info()  { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
die()   { err "$@"; exit 1; }

# ── Parse arguments ───────────────────────────────────────────────────────────
BUILD_API=true
BUILD_WEB=true
DRY_RUN=false
TARGET_BRANCH=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --api-only)  BUILD_API=true;  BUILD_WEB=false; shift ;;
        --web-only)  BUILD_API=false; BUILD_WEB=true;  shift ;;
        --dry-run)   DRY_RUN=true;  shift ;;
        --branch)    TARGET_BRANCH="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,/^$/s/^# \?//p' "$0"
            exit 0
            ;;
        *) die "Unknown option: $1. Use --help for usage." ;;
    esac
done

# ── Resolve repo root (script lives in <root>/scripts/) ──────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
info "Repo root: $REPO_ROOT"

# ── Preflight checks ─────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "Docker is not installed or not in PATH."
docker info >/dev/null 2>&1      || die "Docker daemon is not running."
command -v git >/dev/null 2>&1   || die "git is not installed or not in PATH."

[[ -n "${DOCKERHUB_USERNAME:-}" ]] || die "DOCKERHUB_USERNAME env var is not set."
[[ -n "${DOCKERHUB_TOKEN:-}" ]]    || die "DOCKERHUB_TOKEN env var is not set."

# ── Docker Hub login ─────────────────────────────────────────────────────────
info "Logging in to Docker Hub as ${DOCKERHUB_USERNAME}..."
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin \
    || die "Docker Hub login failed."
ok "Docker Hub login successful."

# ── Branch handling ──────────────────────────────────────────────────────────
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ -n "$TARGET_BRANCH" && "$TARGET_BRANCH" != "$CURRENT_BRANCH" ]]; then
    info "Switching from '$CURRENT_BRANCH' to '$TARGET_BRANCH'..."
    git checkout "$TARGET_BRANCH" || die "Failed to checkout $TARGET_BRANCH"
    CURRENT_BRANCH="$TARGET_BRANCH"
fi

COMMIT_SHA="$(git rev-parse --short HEAD)"
info "Branch: $CURRENT_BRANCH  Commit: $COMMIT_SHA"

# ── Image names & tags ───────────────────────────────────────────────────────
API_IMAGE="${DOCKERHUB_USERNAME}/dev-api-ims"
WEB_IMAGE="${DOCKERHUB_USERNAME}/dev-web-ims"
TAG_LATEST="dev"
TAG_SHA="dev-${COMMIT_SHA}"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
info "Build plan:"
$BUILD_API && info "  API → ${API_IMAGE}:${TAG_LATEST}, ${API_IMAGE}:${TAG_SHA}"
$BUILD_WEB && info "  Web → ${WEB_IMAGE}:${TAG_LATEST}, ${WEB_IMAGE}:${TAG_SHA}"
$DRY_RUN   && warn "  Dry-run mode — images will NOT be pushed."
echo ""

# ── Confirmation ─────────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == false ]]; then
    read -rp "Push images to Docker Hub? (y/N) " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { warn "Aborted by user."; exit 0; }
fi

# ── Build & push helpers ─────────────────────────────────────────────────────
build_and_push() {
    local name="$1"
    local dockerfile="$2"
    local image="$3"

    info "Building ${name} (platform: linux/amd64)..."
    if [[ "$DRY_RUN" == false ]]; then
        docker buildx build \
            --platform linux/amd64 \
            -f "$dockerfile" \
            -t "${image}:${TAG_LATEST}" \
            -t "${image}:${TAG_SHA}" \
            --push \
            . \
            || die "Docker build+push failed for ${name}."
        ok "${name} built and pushed to Docker Hub."
    else
        docker buildx build \
            --platform linux/amd64 \
            -f "$dockerfile" \
            -t "${image}:${TAG_LATEST}" \
            -t "${image}:${TAG_SHA}" \
            --load \
            . \
            || die "Docker build failed for ${name}."
        warn "${name} built locally (dry-run, not pushed)."
    fi
}

# ── Build API ────────────────────────────────────────────────────────────────
if [[ "$BUILD_API" == true ]]; then
    build_and_push "API" "apps/api/Dockerfile" "$API_IMAGE"
fi

# ── Build Web ────────────────────────────────────────────────────────────────
WEB_ENV_FILE="apps/web/.env"
WEB_ENV_CREATED=false

if [[ "$BUILD_WEB" == true ]]; then
    # Create temporary .env for the Next.js build (NEXT_PUBLIC_ vars are baked in at build time)
    if [[ ! -f "$WEB_ENV_FILE" ]]; then
        info "Creating temporary ${WEB_ENV_FILE} for web build..."
        echo "NEXT_PUBLIC_API_URL=https://stage-api.shamankathmandu.com/api/v1" > "$WEB_ENV_FILE"
        WEB_ENV_CREATED=true
    else
        warn "${WEB_ENV_FILE} already exists — using it as-is."
    fi

    build_and_push "Web" "apps/web/Dockerfile" "$WEB_IMAGE"

    # Clean up temporary .env
    if [[ "$WEB_ENV_CREATED" == true ]]; then
        rm -f "$WEB_ENV_FILE"
        info "Cleaned up temporary ${WEB_ENV_FILE}."
    fi
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
ok "===== Deploy complete ====="
if [[ "$DRY_RUN" == false ]]; then
    info "Watchtower will pick up :dev tags within ~30 seconds."
    info "Verify with:  ssh ims_dev 'docker ps'"
else
    info "Dry-run finished. No images were pushed."
fi
