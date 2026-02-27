---
name: content-hash-cache-pattern
description: SHA-256 content-hash caching for file processing pipelines — avoid reprocessing unchanged content, service layer separation, and cache invalidation strategy.
origin: ECC
---

# Content Hash Cache Pattern

Cache expensive file processing operations using SHA-256 content hashes to avoid reprocessing unchanged content.

## When to Activate

- Processing uploaded files (images, documents, CSVs)
- Running expensive transformations on content
- Building import/export pipelines
- Processing webhooks with potentially duplicate payloads
- Any operation where the same input should produce the same output

## Core Concept

```
Input content
    ↓
SHA-256 hash
    ↓
Cache lookup (hash → result)
    ↓
Cache HIT?  → Return cached result (fast)
Cache MISS? → Process content → Store result → Return result
```

The key insight: **identical content always produces identical results**. If the hash matches, we can skip processing entirely.

## Implementation

### Hash Generation

```typescript
import crypto from "crypto";

export function hashContent(content: Buffer | string): string {
  return crypto
    .createHash("sha256")
    .update(typeof content === "string" ? Buffer.from(content) : content)
    .digest("hex");
}

// For files
export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return hashContent(content);
}

// For objects (serialize first)
export function hashObject(obj: unknown): string {
  return hashContent(JSON.stringify(obj));
}
```

### Cache Service

```typescript
// shared/cache/content-hash-cache.service.ts
import { Redis } from "ioredis";
import { hashContent } from "./hash";

export class ContentHashCacheService {
  constructor(
    private redis: Redis,
    private prefix: string,
    private ttlSeconds: number = 86400, // 24 hours default
  ) {}

  private cacheKey(hash: string): string {
    return `${this.prefix}:${hash}`;
  }

  async get<T>(content: Buffer | string): Promise<T | null> {
    const hash = hashContent(content);
    const cached = await this.redis.get(this.cacheKey(hash));
    return cached ? JSON.parse(cached) : null;
  }

  async set<T>(content: Buffer | string, result: T): Promise<void> {
    const hash = hashContent(content);
    await this.redis.setex(
      this.cacheKey(hash),
      this.ttlSeconds,
      JSON.stringify(result),
    );
  }

  async getOrProcess<T>(
    content: Buffer | string,
    processor: () => Promise<T>,
  ): Promise<{ result: T; fromCache: boolean }> {
    const cached = await this.get<T>(content);
    if (cached !== null) {
      return { result: cached, fromCache: true };
    }

    const result = await processor();
    await this.set(content, result);
    return { result, fromCache: false };
  }
}
```

### Service Layer Integration

```typescript
// modules/imports/import.service.ts
export class ImportService {
  private cache: ContentHashCacheService;

  constructor(
    private repo: ImportRepository,
    redis: Redis,
  ) {
    this.cache = new ContentHashCacheService(redis, "import:csv", 3600);
  }

  async processCsvUpload(
    tenantId: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<ImportResult> {
    const { result, fromCache } = await this.cache.getOrProcess(
      fileBuffer,
      async () => {
        // Expensive operation: parse, validate, transform
        const rows = await parseCsv(fileBuffer);
        const validated = await validateRows(rows);
        return transformToImportFormat(validated);
      },
    );

    // Always record the import attempt (even if from cache)
    await this.repo.recordImport({
      tenantId,
      fileName,
      contentHash: hashContent(fileBuffer),
      rowCount: result.rows.length,
      fromCache,
    });

    return result;
  }
}
```

### Controller

```typescript
// modules/imports/import.controller.ts
export class ImportController {
  constructor(private service: ImportService) {}

  async uploadCsv(req: Request, res: Response) {
    try {
      const { tenantId } = getAuthContext(req);
      const file = req.file; // multer
      if (!file) return fail(res, "No file uploaded", 400);

      const result = await this.service.processCsvUpload(
        tenantId,
        file.buffer,
        file.originalname,
      );

      return ok(res, {
        imported: result.rows.length,
        fromCache: result.fromCache,
      }, 201);
    } catch (error) {
      if (error instanceof AppError) return fail(res, error.message, error.statusCode);
      return sendControllerError(req, res, error, "uploadCsv");
    }
  }
}
```

## Database-Backed Cache

For persistent caching (survives Redis restarts):

```typescript
// Use Prisma to store processed results
model ProcessedContent {
  id          String   @id @default(cuid())
  contentHash String   @unique
  result      Json
  processedAt DateTime @default(now())
  expiresAt   DateTime

  @@index([contentHash])
  @@index([expiresAt])
}
```

```typescript
export class DbContentHashCache {
  async getOrProcess<T>(
    content: Buffer | string,
    processor: () => Promise<T>,
    ttlHours = 24,
  ): Promise<{ result: T; fromCache: boolean }> {
    const hash = hashContent(content);

    // Check DB cache
    const cached = await prisma.processedContent.findUnique({
      where: { contentHash: hash },
    });

    if (cached && cached.expiresAt > new Date()) {
      return { result: cached.result as T, fromCache: true };
    }

    // Process and cache
    const result = await processor();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await prisma.processedContent.upsert({
      where: { contentHash: hash },
      create: { contentHash: hash, result: result as object, expiresAt },
      update: { result: result as object, expiresAt },
    });

    return { result, fromCache: false };
  }
}
```

## Idempotent Webhook Processing

```typescript
// Prevent duplicate webhook processing
export class WebhookService {
  async processWebhook(payload: Buffer, signature: string): Promise<void> {
    const hash = hashContent(payload);

    // Check if already processed
    const existing = await this.repo.findByHash(hash);
    if (existing) {
      logger.info({ hash }, "Duplicate webhook, skipping");
      return;
    }

    // Process and record
    const event = JSON.parse(payload.toString());
    await this.handleEvent(event);
    await this.repo.recordProcessed(hash);
  }
}
```

## Cache Key Design

```typescript
// Include version in cache key to invalidate on schema changes
const cacheKey = `${prefix}:v${VERSION}:${hash}`;

// Include tenant for tenant-specific processing
const cacheKey = `${prefix}:${tenantId}:${hash}`;

// Include processing options
const optionsHash = hashObject({ locale: "en", timezone: "UTC" });
const cacheKey = `${prefix}:${contentHash}:${optionsHash}`;
```

## Monitoring

```typescript
// Track cache hit rate
const metrics = {
  hits: 0,
  misses: 0,
  hitRate: () => metrics.hits / (metrics.hits + metrics.misses),
};

// Log cache performance
logger.info({
  operation: "csv_import",
  fromCache,
  contentHash: hash.substring(0, 8), // First 8 chars for logging
  processingTimeMs: fromCache ? 0 : elapsed,
}, "Import processed");
```

## When NOT to Use

```
❌ Content that changes frequently (real-time data)
❌ Content that depends on external state (current time, user preferences)
❌ Small, fast operations (overhead > benefit)
❌ Content with side effects that must always run
   (e.g., sending emails — use idempotency keys instead)
```
