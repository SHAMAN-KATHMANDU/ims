---
name: postgres-patterns
description: PostgreSQL best practices including index design, data types, covering/partial indexes, Row Level Security, cursor pagination, query optimization, and anti-patterns to avoid.
origin: ECC
---

# PostgreSQL Patterns

Production-ready PostgreSQL patterns for performance, security, and correctness.

## When to Activate

- Designing database schemas
- Writing complex queries
- Adding indexes for performance
- Implementing Row Level Security
- Optimizing slow queries
- Implementing cursor-based pagination
- Choosing appropriate data types

## Index Design

### Index Cheat Sheet

```sql
-- B-tree (default): equality, range, ORDER BY
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Composite: multi-column queries (order matters!)
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
-- Covers: WHERE tenant_id = ? AND status = ?
-- Covers: WHERE tenant_id = ? (leftmost prefix)
-- Does NOT cover: WHERE status = ? alone

-- Covering index: include non-key columns to avoid table lookup
CREATE INDEX idx_orders_tenant_covering
  ON orders(tenant_id)
  INCLUDE (status, total, created_at);

-- Partial index: index only a subset of rows
CREATE INDEX idx_orders_pending
  ON orders(tenant_id, created_at)
  WHERE status = 'pending';

-- Unique index
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_categories_tenant_name ON categories(tenant_id, name);

-- Expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Enables: WHERE LOWER(email) = LOWER(?)
```

### When to Add Indexes

```sql
-- ✅ Add indexes for:
-- 1. Foreign keys (Prisma doesn't auto-create these)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 2. Columns used in WHERE clauses frequently
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- 3. Columns used in ORDER BY
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- 4. Columns used in JOIN conditions
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ❌ Don't add indexes for:
-- Small tables (< 1000 rows) — sequential scan is faster
-- Columns with low cardinality (boolean, status with 2-3 values) — unless partial
-- Columns rarely used in queries
-- Write-heavy tables — indexes slow down INSERT/UPDATE/DELETE
```

### Concurrent Index Creation (Production)

```sql
-- Always use CONCURRENTLY in production to avoid table locks
CREATE INDEX CONCURRENTLY idx_orders_tenant ON orders(tenant_id);
CREATE UNIQUE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Drop index concurrently
DROP INDEX CONCURRENTLY idx_old_index;

-- Note: CONCURRENTLY cannot run inside a transaction
-- Note: Takes longer but doesn't block reads/writes
```

## Data Types

### Choosing the Right Type

```sql
-- IDs
id UUID DEFAULT gen_random_uuid()  -- UUID v4 (random)
id TEXT DEFAULT gen_random_uuid()  -- If using Prisma with @default(uuid())
id BIGSERIAL                       -- Auto-increment (simpler, but sequential)

-- Strings
name VARCHAR(100)    -- When you need a length limit
description TEXT     -- Unlimited text (no performance difference in Postgres)
email CITEXT         -- Case-insensitive text (requires citext extension)

-- Numbers
price NUMERIC(10, 2) -- Exact decimal (money, never use FLOAT for money!)
quantity INTEGER     -- Whole numbers
views BIGINT         -- Large counters (> 2 billion)
rating REAL          -- Approximate decimal (scientific data)

-- Dates/Times
created_at TIMESTAMPTZ DEFAULT NOW()  -- Always use TIMESTAMPTZ (with timezone)
birth_date DATE                        -- Date only (no time)
duration INTERVAL                      -- Time intervals

-- JSON
metadata JSONB  -- Binary JSON (indexed, faster queries)
raw_data JSON   -- Text JSON (preserves formatting, rarely needed)

-- Arrays
tags TEXT[]     -- Array of strings
scores INT[]    -- Array of integers

-- Enums
status order_status  -- PostgreSQL enum (fast, but hard to alter)
-- OR use VARCHAR with CHECK constraint (easier to alter):
status VARCHAR(20) CHECK (status IN ('pending', 'active', 'cancelled'))
```

### Money — Never Use FLOAT

```sql
-- ❌ BAD: Floating point precision errors
price FLOAT  -- 0.1 + 0.2 = 0.30000000000000004

-- ✅ GOOD: Exact decimal
price NUMERIC(10, 2)  -- Up to 99,999,999.99
-- Or store as integer cents:
price_cents INTEGER   -- 1000 = $10.00 (avoids decimal entirely)
```

## Row Level Security (RLS)

Enforce multi-tenancy at the database level:

```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Create policy: users can only modify their own records
CREATE POLICY user_own_records ON orders
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- Admin bypass policy
CREATE POLICY admin_all_access ON orders
  USING (current_setting('app.user_role') = 'admin');
```

```typescript
// Set session variables before queries
await prisma.$executeRaw`
  SELECT set_config('app.current_tenant_id', ${tenantId}, true)
`;
```

## Cursor-Based Pagination

```sql
-- Cursor pagination (stable, performant for large datasets)
-- First page
SELECT id, name, created_at
FROM products
WHERE tenant_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 21;  -- Fetch one extra to determine has_next

-- Subsequent pages (using cursor from last item)
SELECT id, name, created_at
FROM products
WHERE tenant_id = $1
  AND (created_at, id) < ($cursor_created_at, $cursor_id)  -- Keyset pagination
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

```typescript
// Prisma cursor pagination
async findPage(tenantId: string, opts: { cursor?: string; limit?: number }) {
  const limit = opts.limit ?? 20;

  const items = await prisma.product.findMany({
    where: { tenantId },
    take: limit + 1, // Fetch one extra
    ...(opts.cursor ? {
      cursor: { id: opts.cursor },
      skip: 1, // Skip the cursor item itself
    } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const hasNext = items.length > limit;
  const data = hasNext ? items.slice(0, limit) : items;

  return {
    items: data,
    nextCursor: hasNext ? data[data.length - 1].id : null,
  };
}
```

## Query Optimization

### EXPLAIN ANALYZE

```sql
-- Always use EXPLAIN ANALYZE to understand query performance
EXPLAIN ANALYZE
SELECT o.*, c.name as customer_name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.tenant_id = 'abc-123'
  AND o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 20;

-- Look for:
-- Seq Scan on large tables → needs index
-- Nested Loop with high rows → N+1 or missing index
-- Hash Join → usually good for large datasets
-- Index Scan → good
-- Bitmap Index Scan → good for range queries
```

### Common Query Patterns

```sql
-- Count with filter (use partial index)
SELECT COUNT(*) FROM orders WHERE tenant_id = $1 AND status = 'pending';
-- Add: CREATE INDEX idx_orders_pending ON orders(tenant_id) WHERE status = 'pending';

-- Full-text search
SELECT * FROM products
WHERE to_tsvector('english', name || ' ' || description) @@ plainto_tsquery('english', $1);
-- Add: CREATE INDEX idx_products_fts ON products USING GIN(to_tsvector('english', name || ' ' || description));

-- JSON queries
SELECT * FROM events WHERE metadata->>'type' = 'purchase';
-- Add: CREATE INDEX idx_events_type ON events((metadata->>'type'));

-- Array contains
SELECT * FROM posts WHERE 'typescript' = ANY(tags);
-- Add: CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
```

## Anti-Patterns to Avoid

```sql
-- ❌ SELECT * (fetches unnecessary columns)
SELECT * FROM users WHERE tenant_id = $1;

-- ✅ Select only needed columns
SELECT id, name, email, role FROM users WHERE tenant_id = $1;

-- ❌ OFFSET pagination on large tables (slow)
SELECT * FROM orders LIMIT 20 OFFSET 100000;

-- ✅ Cursor pagination (fast regardless of position)
SELECT * FROM orders WHERE id > $cursor ORDER BY id LIMIT 20;

-- ❌ NOT IN with subquery (slow, breaks with NULLs)
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders);

-- ✅ NOT EXISTS (faster, handles NULLs correctly)
SELECT * FROM users u WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- ❌ Functions on indexed columns in WHERE (index not used)
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- ✅ Use expression index or CITEXT
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Then: WHERE LOWER(email) = LOWER($1) uses the index

-- ❌ Implicit type casting (prevents index use)
SELECT * FROM orders WHERE id = 123;  -- id is TEXT, 123 is INTEGER

-- ✅ Match types explicitly
SELECT * FROM orders WHERE id = '123';
```

## Connection Pooling

```typescript
// Use PgBouncer or Prisma Accelerate for connection pooling
// Direct connections: max ~100 per Postgres instance
// PgBouncer: can handle thousands of app connections → pool of 20-50 DB connections

// Prisma connection pool settings
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool size (default: 5 * CPU cores)
  // Set via DATABASE_URL: ?connection_limit=10&pool_timeout=20
});

// For serverless (Vercel, Lambda): use connection pooling URL
// DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
```

## Schema Conventions

```sql
-- Table names: snake_case, plural
CREATE TABLE order_items (...);  -- ✅
CREATE TABLE OrderItem (...);    -- ❌

-- Column names: snake_case
tenant_id, created_at, is_active  -- ✅
tenantId, createdAt, isActive     -- ❌

-- Indexes: descriptive names
idx_<table>_<columns>
idx_orders_tenant_id
idx_orders_tenant_status
idx_users_email_lower

-- Foreign keys: <table>_<column>_fkey
orders_customer_id_fkey
order_items_order_id_fkey

-- Constraints: <table>_<column>_check
orders_status_check
products_price_check
```
