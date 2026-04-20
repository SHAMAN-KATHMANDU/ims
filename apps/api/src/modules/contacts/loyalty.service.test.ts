import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/prisma", () => ({
  default: {
    contact: { findUnique: vi.fn() },
    contactTag: { findUnique: vi.fn() },
    contactTagLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/config/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import prisma from "@/config/prisma";
import { getLoyaltyTier, applyLoyaltyTier } from "./loyalty.service";

const mockPrisma = prisma as unknown as {
  contact: { findUnique: ReturnType<typeof vi.fn> };
  contactTag: { findUnique: ReturnType<typeof vi.fn> };
  contactTagLink: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

describe("getLoyaltyTier", () => {
  it("returns VIP tier for purchaseCount >= 3", () => {
    expect(getLoyaltyTier(3)).toEqual({
      tier: "vip",
      label: "VIP",
      tag: "VIP",
    });
    expect(getLoyaltyTier(10)).toEqual({
      tier: "vip",
      label: "VIP",
      tag: "VIP",
    });
  });

  it("returns Repeat Buyer tier for purchaseCount == 2", () => {
    expect(getLoyaltyTier(2)).toEqual({
      tier: "repeat_buyer",
      label: "Repeat Buyer",
      tag: "Repeat Buyer",
    });
  });

  it("returns Customer tier for purchaseCount == 1 (no tag)", () => {
    expect(getLoyaltyTier(1)).toEqual({
      tier: "customer",
      label: "Customer",
      tag: null,
    });
  });

  it("returns Prospect tier for purchaseCount == 0 (no tag)", () => {
    expect(getLoyaltyTier(0)).toEqual({
      tier: "none",
      label: "Prospect",
      tag: null,
    });
  });

  it("returns Prospect tier for negative counts (fallback to lowest tier)", () => {
    // Negative counts don't satisfy any minCount (even 0), so the loop falls
    // through to the trailing return which yields the last tier entry.
    expect(getLoyaltyTier(-1).tier).toBe("none");
    expect(getLoyaltyTier(-100).tier).toBe("none");
  });

  it("tier boundary exactness — 2 is repeat_buyer, 3 is vip (not repeat_buyer)", () => {
    expect(getLoyaltyTier(2).tier).toBe("repeat_buyer");
    expect(getLoyaltyTier(3).tier).toBe("vip");
  });
});

describe("applyLoyaltyTier", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns undefined when the contact does not exist", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);
    const result = await applyLoyaltyTier("missing-id");
    expect(result).toBeUndefined();
    expect(mockPrisma.contactTag.findUnique).not.toHaveBeenCalled();
  });

  it("VIP contact — adds VIP link if missing", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      purchaseCount: 5,
    });
    mockPrisma.contactTag.findUnique.mockImplementation(({ where }) => {
      if (where.tenantId_name.name === "VIP")
        return Promise.resolve({ id: "tag-vip" });
      if (where.tenantId_name.name === "Repeat Buyer")
        return Promise.resolve({ id: "tag-rb" });
      return Promise.resolve(null);
    });
    mockPrisma.contactTagLink.findUnique.mockResolvedValue(null);

    const result = await applyLoyaltyTier("c1");
    expect(result?.tier).toBe("vip");
    // VIP should have been created, Repeat Buyer should NOT be created
    expect(mockPrisma.contactTagLink.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.contactTagLink.create).toHaveBeenCalledWith({
      data: { contactId: "c1", tagId: "tag-vip" },
    });
    expect(mockPrisma.contactTagLink.delete).not.toHaveBeenCalled();
  });

  it("VIP contact — removes stale Repeat Buyer link if it exists", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      purchaseCount: 4,
    });
    mockPrisma.contactTag.findUnique.mockImplementation(({ where }) => {
      if (where.tenantId_name.name === "VIP")
        return Promise.resolve({ id: "tag-vip" });
      if (where.tenantId_name.name === "Repeat Buyer")
        return Promise.resolve({ id: "tag-rb" });
      return Promise.resolve(null);
    });
    mockPrisma.contactTagLink.findUnique.mockImplementation(({ where }) => {
      // Existing link on the Repeat Buyer tag only
      if (where.contactId_tagId.tagId === "tag-rb")
        return Promise.resolve({ id: "link-rb" });
      return Promise.resolve(null);
    });

    await applyLoyaltyTier("c1");
    expect(mockPrisma.contactTagLink.delete).toHaveBeenCalledWith({
      where: { contactId_tagId: { contactId: "c1", tagId: "tag-rb" } },
    });
    // And the VIP link gets created
    expect(mockPrisma.contactTagLink.create).toHaveBeenCalledWith({
      data: { contactId: "c1", tagId: "tag-vip" },
    });
  });

  it("Repeat Buyer contact — promotes from count=2", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      purchaseCount: 2,
    });
    mockPrisma.contactTag.findUnique.mockImplementation(({ where }) =>
      Promise.resolve({ id: `tag-${where.tenantId_name.name}` }),
    );
    mockPrisma.contactTagLink.findUnique.mockResolvedValue(null);

    const result = await applyLoyaltyTier("c1");
    expect(result?.tier).toBe("repeat_buyer");
    expect(mockPrisma.contactTagLink.create).toHaveBeenCalledWith({
      data: { contactId: "c1", tagId: "tag-Repeat Buyer" },
    });
    // VIP should NOT be created — shouldHave is false
    const createCalls = mockPrisma.contactTagLink.create.mock.calls;
    expect(createCalls).toHaveLength(1);
  });

  it("Customer tier (count=1) — removes both VIP and Repeat Buyer links if present", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      purchaseCount: 1,
    });
    mockPrisma.contactTag.findUnique.mockImplementation(({ where }) =>
      Promise.resolve({ id: `tag-${where.tenantId_name.name}` }),
    );
    // Both links exist — both should be removed
    mockPrisma.contactTagLink.findUnique.mockResolvedValue({ id: "link" });

    const result = await applyLoyaltyTier("c1");
    expect(result?.tier).toBe("customer");
    expect(mockPrisma.contactTagLink.delete).toHaveBeenCalledTimes(2);
    expect(mockPrisma.contactTagLink.create).not.toHaveBeenCalled();
  });

  it("skips a tag when contactTag lookup returns null", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      purchaseCount: 5,
    });
    // tenant hasn't yet created the VIP tag — should be silently skipped
    mockPrisma.contactTag.findUnique.mockImplementation(({ where }) => {
      if (where.tenantId_name.name === "VIP") return Promise.resolve(null);
      return Promise.resolve({ id: "tag-rb" });
    });
    mockPrisma.contactTagLink.findUnique.mockResolvedValue(null);

    await applyLoyaltyTier("c1");
    // No create/delete should have happened for VIP; no create for Repeat Buyer
    // (since VIP contact shouldn't have "Repeat Buyer")
    expect(mockPrisma.contactTagLink.create).not.toHaveBeenCalled();
    expect(mockPrisma.contactTagLink.delete).not.toHaveBeenCalled();
  });

  it("is idempotent when links already match tier state", async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      purchaseCount: 5,
    });
    mockPrisma.contactTag.findUnique.mockImplementation(({ where }) =>
      Promise.resolve({ id: `tag-${where.tenantId_name.name}` }),
    );
    // VIP link already exists, Repeat Buyer link does NOT exist — correct state
    mockPrisma.contactTagLink.findUnique.mockImplementation(({ where }) => {
      if (where.contactId_tagId.tagId === "tag-VIP")
        return Promise.resolve({ id: "link-vip" });
      return Promise.resolve(null);
    });

    await applyLoyaltyTier("c1");
    expect(mockPrisma.contactTagLink.create).not.toHaveBeenCalled();
    expect(mockPrisma.contactTagLink.delete).not.toHaveBeenCalled();
  });
});
