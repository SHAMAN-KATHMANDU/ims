/**
 * Prisma seed entry point. Delegates to the modular seed runner.
 *
 * Usage: pnpm seed (or pnpm prisma:seed). Behavior is controlled by env:
 *
 *   SEED_PROFILE   - all (default) | demo | test | minimal
 *   SEED_MODE      - development (default) | production
 *   SEED_TENANTS   - for minimal/production: slug:Name or slug:Name:password (comma-separated)
 *   SEED_DEMO      - false to skip demo tenant when profile=all
 *   SEED_PLATFORM_ADMIN_USERNAME
 *   SEED_PLATFORM_ADMIN_PASSWORD
 */
import "./seeds/index";
