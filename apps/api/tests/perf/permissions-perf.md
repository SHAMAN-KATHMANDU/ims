# Permissions Endpoint Perf Smoke Test

**Endpoint under test:** `GET /api/v1/permissions/me/effective?resourceId=<workspaceId>`

The `/me/effective` endpoint resolves the current user's effective permission
bitset for a given resource. The permission service uses a Redis-backed cache
(`permission.cache.ts`) with a **1-hour TTL** per user+resource+tenantVersion
key. Once a cache entry is warm, the response is a single Redis `GETBUF` call
and a bitset decode — no DB involvement.

---

## Prerequisites

```bash
# API, Postgres, and Redis must all be running
cd /path/to/projectX

# Option A – Docker Compose
docker compose up -d postgres redis
cd apps/api && pnpm dev

# Option B – local services already running
# Ensure DATABASE_URL and REDIS_URL are set in apps/api/.env
```

---

## Obtain a valid Bearer token

```bash
# Login to get a JWT
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"slug":"<tenant-slug>","username":"<user>","password":"<pass>"}' \
  | jq -r '.data.token'
```

---

## 1. Perf smoke — `/me/effective` (cache-hit path)

Warm the cache first with a single request, then benchmark:

```bash
# Step 1 – warm (one request to populate Redis)
WORKSPACE_ID="<workspaceId>"
TOKEN="<bearer-token>"

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/permissions/me/effective?resourceId=$WORKSPACE_ID" \
  | jq .

# Step 2 – 30-second load test, 50 concurrent connections
npx autocannon \
  -d 30 \
  -c 50 \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/permissions/me/effective?resourceId=$WORKSPACE_ID"
```

**Target metrics (warm / cache-hit path):**

| Metric      | Target        |
| ----------- | ------------- |
| p50 latency | < 5 ms        |
| p99 latency | < 10 ms       |
| Throughput  | > 2 000 req/s |

The warm path hits Redis only (no Postgres) so latency is dominated by
network round-trip to Redis + bitset decode (~64 bytes).

---

## 2. Perf smoke — `filterVisible` on list endpoints

`filterVisible` is called inside list controllers (e.g. `GET /api/v1/deals`,
`GET /api/v1/inventory/products`) to strip rows the caller cannot view. It
calls `getEffectivePermissions` per resource; the per-resource Redis cache
means repeat calls inside the same request are cheap after the first hit.

```bash
TOKEN="<bearer-token>"

# Deals list
npx autocannon \
  -d 30 \
  -c 20 \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/deals?page=1&limit=25"

# Products list (inventory)
npx autocannon \
  -d 30 \
  -c 20 \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/inventory/products?page=1&limit=25"
```

### Pre-RBAC baseline comparison

To measure the delta added by `filterVisible`:

```bash
# 1. Stash RBAC changes on a branch without filterVisible
git stash

# 2. Run the same autocannon command (note p50/p99)
npx autocannon -d 30 -c 20 \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/deals?page=1&limit=25"

# 3. Restore RBAC changes
git stash pop

# 4. Re-run and compare
npx autocannon -d 30 -c 20 \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/deals?page=1&limit=25"
```

**Target delta for `filterVisible`:** < 5 ms added to p99 vs pre-RBAC baseline.

Because `getEffectivePermissions` is cached per resource per user, the overhead
for a page of 25 rows belonging to the same workspace is:

- 1 Redis miss on the first row → DB read + cache set (~5–15 ms cold)
- 24 Redis hits for subsequent rows (~0.5 ms each)

Net per-request overhead on a warm cache: **< 2 ms** expected.

---

## Autocannon output fields to capture

```
Stat         2.5%   50%   97.5%   99%   Avg     Stdev   Max
Latency (ms) ...    ...   ...     ...   ...     ...     ...
Req/Sec      ...    ...   ...     ...   ...     ...     ...
Bytes/Sec    ...    ...   ...     ...   ...     ...     ...
```

Record `50%` (p50), `99%` (p99), and `Req/Sec Avg` for each run.
