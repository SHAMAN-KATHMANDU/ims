/**
 * Prisma seed entry point. Delegates to the modular seed runner.
 *
 * ## Orchestrated mode (deploy `./seed.sh` on EC2)
 * Set `SEED_ORCHESTRATED=1`. The shell script sets optional blocks; profile is ignored.
 *
 *   SEED_INCLUDE_TEST      - "true" → full seed test1 + test2
 *   SEED_INCLUDE_RUBY      - "true" → minimal tenant ruby (password: SEED_RUBY_PASSWORD or admin123)
 *   SEED_INCLUDE_DEMO      - "true" → full demo tenant
 *   SEED_MINIMAL_TENANTS   - optional comma list: slug:Name or slug:Name:password
 *   SEED_TENANT_PASSWORD   - default password for minimal entries when omitted in list
 *   SEED_MODE              - logged only (use development recommended for orchestrated)
 *
 * Always: plan limits + system tenant (SEED_PLATFORM_ADMIN_USERNAME / SEED_PLATFORM_ADMIN_PASSWORD).
 *
 * ## Legacy mode (local `pnpm prisma:seed`, CI)
 * Omit SEED_ORCHESTRATED (or not "1"):
 *
 *   SEED_PROFILE   - all (default) | demo | test | minimal
 *   SEED_MODE      - development (default) | production
 *   SEED_TENANTS   - for minimal/production: slug:Name or slug:Name:password (comma-separated)
 *   SEED_DEMO      - false to skip demo tenant when profile=all
 */
import "./seeds/index";
