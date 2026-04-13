# Caddy edge proxy — dev/stage migration runbook

This document describes the one-time cutover from host nginx to containerized
Caddy on the **dev/stage** EC2 host. The TENANT_WEBSITES feature flag must be
enabled for the environment before you start (it is, by default, in
`development` and `staging`).

**Prod is NOT in scope for this runbook.** The plan is to soak on dev for 72+
hours before running an equivalent migration on prod.

---

## 1. What changes

| Before (nginx)                              | After (Caddy)                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| nginx on host holds `:80`/`:443`            | dev_caddy container holds `:80`/`:443`                                                      |
| Certs managed by certbot                    | Certs managed by Caddy ACME (auto-renew)                                                    |
| One explicit `server {}` block per hostname | Explicit blocks for platform hostnames + single on_demand block for tenant domains          |
| Tenant custom domains: not supported        | Tenant custom domains: automatic per-domain TLS via the `/internal/domain-allowed` ask hook |

Existing `stage-ims.shamankathmandu.com` and `stage-api.shamankathmandu.com`
keep working; Caddy picks up the same cert during its first startup (or
issues fresh ones via ACME — either works).

The `dev_web` and `dev_api` containers are **untouched**. They stay on
`:3000` / `:4000` and Caddy reverse-proxies to them from inside the docker
network.

---

## 2. Pre-flight checklist

On the dev EC2 host:

- [ ] `deploy/dev/.env` has `INTERNAL_API_TOKEN` set (≥ 32 chars, random). Generate with:
      `bash
    openssl rand -hex 32
    `
- [ ] `deploy/dev/.env` has `REVALIDATE_SECRET` set (same way).
- [ ] `deploy/dev/.env` has `API_PUBLIC_URL=https://stage-api.shamankathmandu.com/api/v1`.
- [ ] The API container is running the latest image (contains `/api/v1/internal/domain-allowed`).
- [ ] You have an escape hatch: a second SSH session ready to run `./teardown-caddy.sh`.
- [ ] You've notified anyone who might notice if `stage-ims.*` blips for 30 seconds.

---

## 3. Cutover

One command, runs on the EC2 host inside `deploy/dev/`:

```bash
./setup-caddy.sh
```

The script:

1. Validates `.env` (required secrets + API_PUBLIC_URL).
2. Stops + disables the host `nginx` service.
3. Pulls `caddy:2.8-alpine` and `rpandox/dev-tenant-site-ims:dev`.
4. Starts the `websites` compose profile (`dev_caddy` + `dev_tenant_site`).
5. Verifies the ask hook by calling it from inside the Caddy container.
6. Prints next-step smoke tests.

**Expected runtime:** ~30–60 seconds (image pull dominates).

**What "success" looks like:**

- `curl -v https://stage-ims.shamankathmandu.com` returns the IMS login page with a valid TLS cert issued by Let's Encrypt.
- `curl -v https://stage-api.shamankathmandu.com/api/v1/` returns the `"API is running"` JSON.
- `docker logs dev_caddy` shows `"issued certificate"` for both platform hostnames.

---

## 4. Smoke-testing on-demand TLS with a scratch domain

1. Point a domain you control (e.g. `test.yourdomain.dev`) at the EC2 public IP with an A record.
2. In the IMS, log in as a platformAdmin, enable the website feature for a test tenant, and add `test.yourdomain.dev` as a WEBSITE-type domain.
3. Follow the verify flow: copy the TXT record shown in the Verify dialog, add it at your registrar, click **Verify now**. Wait for the success toast.
4. In a fresh terminal, hit the scratch domain:
   ```bash
   curl -v https://test.yourdomain.dev/
   ```
5. Watch `docker logs -f dev_caddy` in parallel. You should see:
   - `on_demand_tls asking` (the ask hook firing)
   - `"allowed"` in the response
   - ACME solving
   - The actual HTTP response from the tenant-site renderer

If you see `"allowed":false,"reason":"not_verified"` — the TXT record isn't correctly set or hasn't propagated. Nothing is broken, the system is correctly refusing to burn a cert.

---

## 5. Rollback

If the cutover misbehaves:

```bash
./teardown-caddy.sh
```

- Stops `dev_caddy` + `dev_tenant_site`.
- Re-enables and starts host nginx.
- Existing Caddy certs are preserved in the `caddy_data` volume (so a re-cutover doesn't re-issue them).
- **Total downtime:** ~10 seconds while nginx restarts.

Alternatively, the nuclear rollback: set `FEATURE_FLAGS` on `dev_api` to a comma-separated list that does NOT include `TENANT_WEBSITES`. The backend instantly 404s every `/internal/*`, `/public/*`, `/sites/*`, and `/platform/*/domains|website*` route. Caddy's ask hook starts getting 404s → it refuses to issue new certs. Existing certs keep working for their lifetime (~90 days).

---

## 6. Known limitations

- **Query-param token leakage.** The ask hook passes `INTERNAL_API_TOKEN` via `?_t=<token>` in the URL because Caddyfile doesn't let us inject headers on the `ask` directive. The token is only sent inside the docker network (`dev_caddy` → `dev_api` over the `ims-dev` bridge), so it never crosses a network boundary. Still, **don't copy this Caddyfile to an external Caddy** without swapping the ask URL to HTTPS and using a custom HTTP handler that sends the token via header.
- **No HSTS preload yet.** Caddy defaults to sane TLS + HSTS, but we haven't submitted any of the stage hostnames to the HSTS preload list. Do that only after prod cutover.
- **ACME rate limits.** Let's Encrypt allows **50 certs per registered domain per week**. If you burn through that by accidentally adding 60 subdomains during a test, Caddy will refuse new issuance until the window expires. The ask hook + `verifyToken` gate should prevent this, but it's worth knowing.

---

## 7. Going to prod

Prod is NOT covered by this runbook. When dev has soaked for 72h+ without incident:

1. Copy `deploy/dev/Caddyfile` → `deploy/prod/Caddyfile`, update the server_name blocks to `app.shamanyantra.com` / `api.shamanyantra.com`.
2. Copy `setup-caddy.sh` / `teardown-caddy.sh` to `deploy/prod/` (unchanged content).
3. Add the `websites` profile services to `deploy/prod/docker-compose.yml` with `prod_` prefixes.
4. Flip `TENANT_WEBSITES: true` in the `production` row of `packages/shared/src/config/env-features.ts`, rebuild `@repo/shared`, redeploy `prod_api`.
5. SSH to prod, run `./setup-caddy.sh`, smoke test, monitor.

Prod migration is its own PR, its own soak window, its own runbook. Do not bundle it with this one.
