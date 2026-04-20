# Caddy edge proxy — prod migration runbook

This document describes the one-time cutover from host nginx to containerized
Caddy on the **prod** EC2 host. Dev/staging soaked on Caddy for 72+ hours
before this runbook was written.

---

## 1. What changes

| Before (nginx)                              | After (Caddy)                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| nginx on host holds `:80`/`:443`            | prod_caddy container holds `:80`/`:443`                                                     |
| Certs managed by certbot                    | Certs managed by Caddy ACME (auto-renew)                                                    |
| One explicit `server {}` block per hostname | Explicit blocks for platform hostnames + single on_demand block for tenant domains          |
| Tenant custom domains: not supported        | Tenant custom domains: automatic per-domain TLS via the `/internal/domain-allowed` ask hook |

Existing `app.shamanyantra.com` and `api.shamanyantra.com` keep working;
Caddy picks up the same cert during its first startup (or issues fresh ones
via ACME — either works).

The `prod_web` and `prod_api` containers are **untouched**. They stay on
`:3000` / `:4000` and Caddy reverse-proxies to them from inside the docker
network.

---

## 2. Pre-flight checklist

On the prod EC2 host:

- [ ] Run `./backup-db.sh` and confirm the dump is in `/home/ubuntu/backups`.
- [ ] `deploy/prod/.env` has `INTERNAL_API_TOKEN` set (≥ 32 chars, random). Generate with:
      `bash
  openssl rand -hex 32
  `
- [ ] `deploy/prod/.env` has `REVALIDATE_SECRET` set (same way).
- [ ] `deploy/prod/.env` has `API_PUBLIC_URL=https://api.shamanyantra.com/api/v1`.
- [ ] `deploy/prod/.env` has `TENANT_SITE_INTERNAL_URL=http://prod_tenant_site:3100`.
- [ ] The `prod_api` container is running the latest `:prod` image (contains `/api/v1/internal/domain-allowed` and has `TENANT_WEBSITES: true` in the feature matrix).
- [ ] You have an escape hatch: a second SSH session ready to run `./teardown-caddy.sh`.
- [ ] You've notified the team that `app.shamanyantra.com` may blip for ~30 seconds during cutover.

---

## 3. Cutover

One command, run on the EC2 host inside `deploy/prod/`:

```bash
./setup-caddy.sh
```

The script:

1. Validates `.env` (required secrets + API_PUBLIC_URL).
2. Stops + disables the host `nginx` service.
3. Pulls `caddy:2.8-alpine` and `rpandox/dev-tenant-site-ims:prod`.
4. Starts the `websites` compose profile (`prod_caddy` + `prod_tenant_site`).
5. Verifies the ask hook by calling it from inside the Caddy container.
6. Prints next-step smoke tests.

**Expected runtime:** ~30–60 seconds (image pull dominates).

**What "success" looks like:**

- `curl -v https://app.shamanyantra.com` returns the IMS login page with a valid TLS cert.
- `curl -v https://api.shamanyantra.com/api/v1/` returns the `"API is running"` JSON.
- `docker logs prod_caddy` shows `"issued certificate"` for both platform hostnames.

---

## 4. Smoke-testing on-demand TLS with a scratch domain

1. Point a domain you control (e.g. `test.yourdomain.dev`) at the prod EC2 public IP with an A record.
2. In the IMS, log in as a platformAdmin, enable the website feature for a test tenant, and add `test.yourdomain.dev` as a WEBSITE-type domain.
3. Follow the verify flow: copy the TXT record shown in the Verify dialog, add it at your registrar, click **Verify now**. Wait for the success toast.
4. In a fresh terminal, hit the scratch domain:
   ```bash
   curl -v https://test.yourdomain.dev/
   ```
5. Watch `docker logs -f prod_caddy` in parallel. You should see:
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

- Stops `prod_caddy` + `prod_tenant_site`.
- Re-enables and starts host nginx.
- Existing Caddy certs are preserved in the `prod_caddy_data` volume (so a re-cutover doesn't re-issue them).
- **Total downtime:** ~10 seconds while nginx restarts.

Alternatively, the nuclear rollback: set `FEATURE_FLAGS` on `prod_api` to a comma-separated list that does NOT include `TENANT_WEBSITES`. The backend instantly 404s every `/internal/*`, `/public/*`, `/sites/*`, and `/platform/*/domains|website*` route. Caddy's ask hook starts getting 404s → it refuses to issue new certs. Existing certs keep working for their lifetime (~90 days).

---

## 6. Known limitations

- **Query-param token leakage.** The ask hook passes `INTERNAL_API_TOKEN` via `?_t=<token>` in the URL because Caddyfile doesn't let us inject headers on the `ask` directive. The token is only sent inside the docker network (`prod_caddy` → `prod_api` over the `ims-prod` bridge), so it never crosses a network boundary. Still, **don't copy this Caddyfile to an external Caddy** without swapping the ask URL to HTTPS and using a custom HTTP handler that sends the token via header.
- **No HSTS preload yet.** Caddy defaults to sane TLS + HSTS, but we haven't submitted prod hostnames to the HSTS preload list.
- **ACME rate limits.** Let's Encrypt allows **50 certs per registered domain per week**. If you burn through that by accidentally adding many subdomains during testing, Caddy will refuse new issuance until the window expires. The ask hook + `verifyToken` gate prevents this in normal use.
