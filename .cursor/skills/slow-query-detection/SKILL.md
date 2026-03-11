---
name: slow-query-detection
description: Missing indexes, N+1 queries, full table scans, EXPLAIN ANALYZE patterns.
origin: projectX-audit
---

# Slow Query Detection

Identify and fix database performance issues.

## When to Activate

- High latency on list or detail endpoints
- Production slow query logs
- Adding new filters or sort options
- Scaling to larger datasets

## N+1 Detection

- Look for loops that call `findUnique` or `findFirst` inside
- Use Prisma `include` or batch `findMany({ where: { id: { in: [...] } } })`
- Enable Prisma query logging to spot repeated queries

## Index Coverage

- Add `@@index` for `where` and `orderBy` columns
- Compound indexes for common filter combinations
- Avoid over-indexing (write cost)

## EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

- Seq Scan on large tables → add index
- High "rows" vs "actual rows" → refine query or index
