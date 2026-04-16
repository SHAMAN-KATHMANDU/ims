# Rollback Runbook

When a production release misbehaves, follow the fastest path that matches
the failure mode. All paths assume you have shell access to the prod host
(`/home/ubuntu/ims` or equivalent) and can trigger GitHub Actions.

---

## 1. Rollback app image to a prior tag (fastest; no DB change)

Use this when a code or config change is bad but data is intact.

1. Open **Actions → Release (Production) → Run workflow**.
2. `release_type = rollback`.
3. `tag = <prior good tag>` (e.g. `v1.2.0`). Use `git tag -l 'v*' --sort=-v:refname | head -10` if unsure — the workflow also prints recent tags.
4. Run. This rebuilds and pushes `:v1.2.0`, `:prod`, `:latest`.
5. Watchtower on prod EC2 polls every 30s and pulls `:prod` automatically (see `deploy/prod/watchtower.yml`). No SSH needed.
6. **Verify:**
   - `curl -sS https://api.<prod-host>/health` returns 200
   - Open the web app, log in, spot-check a read + write path
   - Check logs: `docker logs prod_api --tail 200` and `docker logs prod_web --tail 200`

**Recovery time:** ~5–10 min (build + Watchtower poll).

## 2. Force Watchtower immediately (skip 30s poll)

On the prod host:

```bash
docker exec watchtower /watchtower --run-once prod_api prod_web
```

Shaves off up to 30s of poll latency when paired with path 1.

## 3. Rollback DB (destructive — gated by approval)

Required only if a migration corrupted data. **Loses all writes since the
backup timestamp.** Get explicit sign-off from the on-call owner before
running.

1. SSH to prod host.
2. List backups:
   ```bash
   ls -lh /home/ubuntu/backups/daily/
   ```
3. Stop API so no writes leak in mid-restore:
   ```bash
   docker compose -f deploy/prod/docker-compose.yml stop prod_api prod_web
   ```
4. Restore (pick the backup file — e.g. `ims-YYYY-MM-DD.sql.gz`):
   ```bash
   gunzip -c /home/ubuntu/backups/daily/<file>.sql.gz | \
     docker exec -i prod_db psql -U postgres -d ims
   ```
   The dumps were taken with `--clean --if-exists` so they drop and
   recreate objects on restore.
5. Bring the app back (ideally rolled back to a compatible tag per path 1):
   ```bash
   docker compose -f deploy/prod/docker-compose.yml up -d prod_api prod_web
   ```
6. Verify as in path 1, plus:
   - `docker exec prod_db psql -U postgres -d ims -c "SELECT count(*) FROM tenants;"` matches pre-incident baseline
   - Smoke-test a tenant login + one data read

Retention: 7 daily + 4 weekly + 3 monthly (see `deploy/prod/docker-compose.yml:59-61`).

## Smoke-check URLs

Replace `<prod-host>` with your host:

| Check            | URL                               |
| ---------------- | --------------------------------- |
| API health       | `https://api.<prod-host>/health`  |
| API version      | `https://api.<prod-host>/version` |
| Web home         | `https://<prod-host>/`            |
| Tenant-site home | `https://<tenant>.<prod-host>/`   |

## Paging the right people

- **App regression, data intact:** follow path 1 yourself; notify `#releases`.
- **DB corruption or data loss:** notify `#incidents`, page the DB owner, get
  sign-off before path 3.
- **Watchtower hung / not pulling:** SSH in, `docker logs watchtower --tail 200`,
  restart with `docker restart watchtower`.
