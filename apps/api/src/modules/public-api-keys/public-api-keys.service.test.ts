import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { PublicApiKeysService } from "./public-api-keys.service";
import type { PublicApiKeysRepository } from "./public-api-keys.repository";

type RepoMock = {
  [K in keyof PublicApiKeysRepository]: ReturnType<typeof vi.fn>;
};

function makeRepoMock(): RepoMock {
  return {
    findById: vi.fn(),
    findByPrefix: vi.fn(),
    findVerifiedDomain: vi.fn(),
    listByTenant: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    touchLastUsed: vi.fn(),
  };
}

const tenantId = "tenant-1";
const domainId = "domain-1";

const verifiedDomain = {
  id: domainId,
  tenantId,
  hostname: "shop.acme.com",
  appType: "API",
  isPrimary: false,
  verifyToken: "tok",
  verifiedAt: new Date("2026-01-01T00:00:00Z"),
  tlsStatus: "PENDING",
  tlsLastError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PublicApiKeysService.generateKey", () => {
  it("returns a key matching pk_live_<8hex>_<32hex>", () => {
    const svc = new PublicApiKeysService(
      makeRepoMock() as unknown as PublicApiKeysRepository,
    );
    const { key, prefix, secret } = svc.generateKey();
    expect(key).toMatch(/^pk_live_[0-9a-f]{8}_[0-9a-f]{32}$/);
    expect(prefix).toMatch(/^pk_live_[0-9a-f]{8}$/);
    expect(secret).toMatch(/^[0-9a-f]{32}$/);
    expect(key).toBe(`${prefix}_${secret}`);
  });

  it("produces different keys on each call", () => {
    const svc = new PublicApiKeysService(
      makeRepoMock() as unknown as PublicApiKeysRepository,
    );
    const a = svc.generateKey();
    const b = svc.generateKey();
    expect(a.key).not.toBe(b.key);
  });
});

describe("PublicApiKeysService.parseKey", () => {
  let svc: PublicApiKeysService;

  beforeEach(() => {
    svc = new PublicApiKeysService(
      makeRepoMock() as unknown as PublicApiKeysRepository,
    );
  });

  it("parses a well-formed key", () => {
    const raw = `pk_live_${"a".repeat(8)}_${"b".repeat(32)}`;
    const parsed = svc.parseKey(raw);
    expect(parsed).toEqual({
      prefix: `pk_live_${"a".repeat(8)}`,
      secret: "b".repeat(32),
    });
  });

  it("rejects missing prefix", () => {
    expect(svc.parseKey(`${"a".repeat(8)}_${"b".repeat(32)}`)).toBeNull();
  });

  it("rejects wrong prefix length", () => {
    expect(svc.parseKey(`pk_live_aaaa_${"b".repeat(32)}`)).toBeNull();
  });

  it("rejects wrong secret length", () => {
    expect(
      svc.parseKey(`pk_live_${"a".repeat(8)}_${"b".repeat(31)}`),
    ).toBeNull();
  });

  it("rejects non-hex characters", () => {
    expect(
      svc.parseKey(`pk_live_${"z".repeat(8)}_${"b".repeat(32)}`),
    ).toBeNull();
  });

  it("rejects extra segments", () => {
    expect(
      svc.parseKey(`pk_live_${"a".repeat(8)}_${"b".repeat(32)}_x`),
    ).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(svc.parseKey(123 as unknown as string)).toBeNull();
  });
});

describe("PublicApiKeysService.issue", () => {
  let repo: RepoMock;
  let svc: PublicApiKeysService;

  beforeEach(() => {
    repo = makeRepoMock();
    svc = new PublicApiKeysService(repo as unknown as PublicApiKeysRepository);
  });

  it("rejects when domain is not found", async () => {
    repo.findVerifiedDomain.mockResolvedValue(null);
    await expect(
      svc.issue(tenantId, { name: "k", tenantDomainId: domainId }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects when domain is not DNS-verified", async () => {
    repo.findVerifiedDomain.mockResolvedValue({
      ...verifiedDomain,
      verifiedAt: null,
    });
    await expect(
      svc.issue(tenantId, { name: "k", tenantDomainId: domainId }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("creates a hashed record on success and returns the full key", async () => {
    repo.findVerifiedDomain.mockResolvedValue(verifiedDomain);
    repo.create.mockImplementation(async (data) => ({
      id: "new-id",
      tenantId,
      tenantDomainId: data.tenantDomainId,
      name: data.name,
      prefix: data.prefix,
      hash: data.hash,
      last4: data.last4,
      scopes: [],
      rateLimitPerMin: data.rateLimitPerMin ?? 120,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      tenantDomain: verifiedDomain,
    }));

    const issued = await svc.issue(tenantId, {
      name: "Acme prod",
      tenantDomainId: domainId,
    });

    expect(issued.key).toMatch(/^pk_live_[0-9a-f]{8}_[0-9a-f]{32}$/);
    expect(repo.create).toHaveBeenCalledTimes(1);
    const created = repo.create.mock.calls[0][0];
    // Hash must NOT equal the raw secret.
    expect(created.hash).not.toBe(issued.key);
    // bcrypt hashes start with $2 — sanity-check the algorithm choice.
    expect(created.hash.startsWith("$2")).toBe(true);
    // last4 must be the last 4 chars of the secret half.
    const secret = issued.key.split("_").pop()!;
    expect(created.last4).toBe(secret.slice(-4));
    // Hash matches the secret.
    await expect(bcrypt.compare(secret, created.hash)).resolves.toBe(true);
  });
});

describe("PublicApiKeysService.verifyKey", () => {
  let repo: RepoMock;
  let svc: PublicApiKeysService;

  beforeEach(() => {
    repo = makeRepoMock();
    svc = new PublicApiKeysService(repo as unknown as PublicApiKeysRepository);
  });

  it("returns null on malformed key", async () => {
    expect(await svc.verifyKey("garbage")).toBeNull();
    expect(repo.findByPrefix).not.toHaveBeenCalled();
  });

  it("returns null when prefix not found", async () => {
    repo.findByPrefix.mockResolvedValue(null);
    const raw = `pk_live_${"a".repeat(8)}_${"b".repeat(32)}`;
    expect(await svc.verifyKey(raw)).toBeNull();
  });

  it("returns null when key is revoked", async () => {
    const secret = "b".repeat(32);
    const hash = await bcrypt.hash(secret, 4);
    repo.findByPrefix.mockResolvedValue({
      id: "k1",
      tenantId,
      tenantDomainId: domainId,
      name: "k",
      prefix: `pk_live_${"a".repeat(8)}`,
      hash,
      last4: secret.slice(-4),
      scopes: [],
      rateLimitPerMin: 120,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: new Date(),
      tenantDomain: verifiedDomain,
    });
    expect(
      await svc.verifyKey(`pk_live_${"a".repeat(8)}_${secret}`),
    ).toBeNull();
  });

  it("returns null on wrong secret", async () => {
    const hash = await bcrypt.hash("c".repeat(32), 4);
    repo.findByPrefix.mockResolvedValue({
      id: "k1",
      tenantId,
      tenantDomainId: domainId,
      name: "k",
      prefix: `pk_live_${"a".repeat(8)}`,
      hash,
      last4: "cccc",
      scopes: [],
      rateLimitPerMin: 120,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      tenantDomain: verifiedDomain,
    });
    expect(
      await svc.verifyKey(`pk_live_${"a".repeat(8)}_${"b".repeat(32)}`),
    ).toBeNull();
  });

  it("returns the record on a valid, unrevoked key", async () => {
    const secret = "d".repeat(32);
    const hash = await bcrypt.hash(secret, 4);
    const record = {
      id: "k1",
      tenantId,
      tenantDomainId: domainId,
      name: "k",
      prefix: `pk_live_${"a".repeat(8)}`,
      hash,
      last4: "dddd",
      scopes: [],
      rateLimitPerMin: 120,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      tenantDomain: verifiedDomain,
    };
    repo.findByPrefix.mockResolvedValue(record);
    const result = await svc.verifyKey(`pk_live_${"a".repeat(8)}_${secret}`);
    expect(result?.id).toBe("k1");
  });
});

describe("PublicApiKeysService.revoke", () => {
  let repo: RepoMock;
  let svc: PublicApiKeysService;

  beforeEach(() => {
    repo = makeRepoMock();
    svc = new PublicApiKeysService(repo as unknown as PublicApiKeysRepository);
  });

  it("404s when key does not exist", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.revoke("k1", tenantId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("400s when key is already revoked", async () => {
    repo.findById.mockResolvedValue({
      id: "k1",
      revokedAt: new Date(),
    });
    await expect(svc.revoke("k1", tenantId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("sets revokedAt on success", async () => {
    repo.findById.mockResolvedValue({ id: "k1", revokedAt: null });
    repo.update.mockResolvedValue({ id: "k1", revokedAt: new Date() });
    await svc.revoke("k1", tenantId);
    expect(repo.update).toHaveBeenCalledWith(
      "k1",
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });
});

describe("PublicApiKeysService.rotate", () => {
  let repo: RepoMock;
  let svc: PublicApiKeysService;

  beforeEach(() => {
    repo = makeRepoMock();
    svc = new PublicApiKeysService(repo as unknown as PublicApiKeysRepository);
  });

  it("404s when key does not exist", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.rotate("k1", tenantId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("400s when key is already revoked", async () => {
    repo.findById.mockResolvedValue({
      id: "k1",
      revokedAt: new Date(),
      name: "old",
      tenantDomainId: domainId,
      rateLimitPerMin: 120,
    });
    await expect(svc.rotate("k1", tenantId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("revokes old + issues new bound to the same domain", async () => {
    repo.findById.mockResolvedValue({
      id: "k1",
      revokedAt: null,
      name: "old",
      tenantDomainId: domainId,
      rateLimitPerMin: 120,
    });
    repo.update.mockResolvedValue({ id: "k1", revokedAt: new Date() });
    repo.findVerifiedDomain.mockResolvedValue(verifiedDomain);
    repo.create.mockImplementation(async (data) => ({
      id: "k2",
      tenantId,
      tenantDomainId: data.tenantDomainId,
      name: data.name,
      prefix: data.prefix,
      hash: data.hash,
      last4: data.last4,
      scopes: [],
      rateLimitPerMin: data.rateLimitPerMin ?? 120,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      tenantDomain: verifiedDomain,
    }));

    const result = await svc.rotate("k1", tenantId);
    expect(result.revokedId).toBe("k1");
    expect(result.issued.record.id).toBe("k2");
    expect(result.issued.record.tenantDomainId).toBe(domainId);
    // Old key was marked revoked first.
    expect(repo.update).toHaveBeenCalledWith(
      "k1",
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });
});
