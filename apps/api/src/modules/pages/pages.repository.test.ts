/**
 * Unit test — pages.repository.upsertCustomPage tolerates pre-existing
 * scope rows on the same slug.
 *
 * Regression for the bug where the new pickTemplate flow (PR #528) failed
 * with a 409 `(tenant_id, slug)` unique-constraint violation when a tenant
 * already had legacy `kind="scope"` rows with slugs `"offers"` / `"cart"`
 * / `"contact"` from the pre-PR-#528 `upsertScopePage` calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirstMock = vi.fn();
const updateMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    tenantPage: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

// Import AFTER vi.mock so the repo wires up against the mocked prisma.
import pagesRepo from "./pages.repository";

describe("pagesRepo.upsertCustomPage — Bug 1 regression: scope→page slug collision", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    updateMock.mockReset();
    createMock.mockReset();
  });

  it("queries by (tenantId, slug) only — no kind filter", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "new-id" });

    await pagesRepo.upsertCustomPage(
      "t-1",
      { slug: "offers", title: "Offers" },
      true,
    );

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { tenantId: "t-1", slug: "offers" },
    });
  });

  it("converts a legacy kind='scope' row into a kind='page' row when overwriteExisting=true", async () => {
    findFirstMock.mockResolvedValue({
      id: "legacy-scope-id",
      tenantId: "t-1",
      kind: "scope",
      scope: "offers",
      slug: "offers",
      title: "Offers",
      isBuiltInScope: true,
    });
    updateMock.mockResolvedValue({
      id: "legacy-scope-id",
      kind: "page",
      scope: null,
      slug: "offers",
      title: "Offers",
    });

    const result = await pagesRepo.upsertCustomPage(
      "t-1",
      { slug: "offers", title: "Offers" },
      true,
    );

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "legacy-scope-id" },
        data: expect.objectContaining({
          kind: "page",
          scope: null,
          isBuiltInScope: false,
          title: "Offers",
        }),
      }),
    );
    expect(createMock).not.toHaveBeenCalled();
    expect(result.id).toBe("legacy-scope-id");
  });

  it("returns the existing row untouched when overwriteExisting=false", async () => {
    const existing = {
      id: "existing-id",
      tenantId: "t-1",
      kind: "scope",
      scope: "cart",
      slug: "cart",
      title: "Cart",
    };
    findFirstMock.mockResolvedValue(existing);

    const result = await pagesRepo.upsertCustomPage(
      "t-1",
      { slug: "cart", title: "Cart" },
      false,
    );

    expect(result).toBe(existing);
    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a new row when no row with the slug exists", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "fresh-id" });

    const result = await pagesRepo.upsertCustomPage(
      "t-1",
      { slug: "/", title: "Home" },
      false,
    );

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "t-1",
        slug: "/",
        title: "Home",
        kind: "page",
        scope: null,
        isBuiltInScope: false,
      }),
    });
    expect(result.id).toBe("fresh-id");
  });
});
