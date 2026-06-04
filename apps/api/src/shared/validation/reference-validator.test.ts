import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Mock the Prisma client. Each delegate the validator touches is an object with
 * findFirst / findMany vitest mocks so tests can stub return values per case.
 * Built via vi.hoisted so it exists before the hoisted vi.mock factory runs.
 */
const prismaMock = vi.hoisted(() => {
  const mk = () => ({ findFirst: vi.fn(), findMany: vi.fn() });
  return {
    crmSource: mk(),
    crmJourneyType: mk(),
    contactTag: mk(),
    productTag: mk(),
    category: mk(),
    vendor: mk(),
    location: mk(),
    discountType: mk(),
    company: mk(),
    member: mk(),
    user: mk(),
    contact: mk(),
    deal: mk(),
    task: mk(),
    lead: mk(),
    activity: mk(),
    product: mk(),
    pipeline: mk(),
  };
});

vi.mock("@/config/prisma", () => ({ default: prismaMock }));

import {
  resolveNamedLookup,
  assertEntityExists,
  resolvePipelineStage,
  listNamedLookup,
} from "./reference-validator";

const tenantId = "t1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveNamedLookup", () => {
  it("returns the canonical {id,name} when found (case-insensitive query)", async () => {
    prismaMock.crmSource.findFirst.mockResolvedValue({
      id: "s1",
      name: "Website",
    });

    const result = await resolveNamedLookup({
      tenantId,
      kind: "crm_source",
      value: "  website ",
    });

    expect(result).toEqual({ id: "s1", name: "Website" });
    const arg = prismaMock.crmSource.findFirst.mock.calls[0][0];
    expect(arg.where).toMatchObject({
      tenantId,
      name: { equals: "website", mode: "insensitive" },
    });
  });

  it("throws a reference error WITH availableOptions when not found", async () => {
    prismaMock.crmJourneyType.findFirst.mockResolvedValue(null);
    prismaMock.crmJourneyType.findMany.mockResolvedValue([
      { id: "j1", name: "New" },
      { id: "j2", name: "Nurturing" },
    ]);

    await expect(
      resolveNamedLookup({
        tenantId,
        kind: "crm_journey_type",
        value: "VIP",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "REFERENCE_INVALID",
      referenceKind: "crm_journey_type",
      availableOptions: [
        { id: "j1", name: "New" },
        { id: "j2", name: "Nurturing" },
      ],
    });
  });

  it("rejects an empty value without querying options", async () => {
    await expect(
      resolveNamedLookup({ tenantId, kind: "category", value: "   " }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prismaMock.category.findMany).not.toHaveBeenCalled();
  });
});

describe("listNamedLookup", () => {
  it("returns the tenant's options for a kind", async () => {
    prismaMock.vendor.findMany.mockResolvedValue([{ id: "v1", name: "Acme" }]);
    const options = await listNamedLookup(tenantId, "vendor");
    expect(options).toEqual([{ id: "v1", name: "Acme" }]);
  });
});

describe("assertEntityExists", () => {
  it("is a no-op for null/undefined/empty ids", async () => {
    await assertEntityExists({ tenantId, kind: "company", id: null });
    await assertEntityExists({ tenantId, kind: "company", id: undefined });
    await assertEntityExists({ tenantId, kind: "company", id: "  " });
    await assertEntityExists({ tenantId, kind: "company", id: [] });
    expect(prismaMock.company.findFirst).not.toHaveBeenCalled();
  });

  it("passes when the row exists for the tenant", async () => {
    prismaMock.company.findFirst.mockResolvedValue({ id: "c1" });
    await expect(
      assertEntityExists({ tenantId, kind: "company", id: "c1" }),
    ).resolves.toBeUndefined();
    expect(prismaMock.company.findFirst).toHaveBeenCalledWith({
      where: { id: "c1", tenantId },
      select: { id: true },
    });
  });

  it("throws naming the missing id when not found", async () => {
    prismaMock.member.findFirst.mockResolvedValue(null);
    await expect(
      assertEntityExists({
        tenantId,
        kind: "member",
        id: "missing",
        fieldName: "memberId",
      }),
    ).rejects.toMatchObject({ statusCode: 400, referenceKind: "member" });
  });

  it("validates every id in an array and reports the missing one", async () => {
    prismaMock.product.findFirst
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce(null);
    await expect(
      assertEntityExists({
        tenantId,
        kind: "product",
        id: ["p1", "p2"],
        fieldName: "productIds",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("resolvePipelineStage", () => {
  it("returns the canonical stage name (case-insensitive match)", async () => {
    prismaMock.pipeline.findFirst.mockResolvedValue({
      id: "p1",
      name: "Sales",
      stages: [
        { id: "st1", name: "Lead" },
        { id: "st2", name: "Won" },
      ],
    });

    const stage = await resolvePipelineStage({
      tenantId,
      pipelineId: "p1",
      stageName: "lead",
    });
    expect(stage).toBe("Lead");
  });

  it("throws with the list of valid stages when the stage is unknown", async () => {
    prismaMock.pipeline.findFirst.mockResolvedValue({
      id: "p1",
      name: "Sales",
      stages: [{ id: "st1", name: "Lead" }],
    });

    await expect(
      resolvePipelineStage({ tenantId, pipelineId: "p1", stageName: "Nope" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      referenceKind: "pipeline_stage",
      availableOptions: [{ id: "Lead", name: "Lead" }],
    });
  });

  it("throws when the pipeline is missing for the tenant", async () => {
    prismaMock.pipeline.findFirst.mockResolvedValue(null);
    await expect(
      resolvePipelineStage({ tenantId, pipelineId: "x", stageName: "Lead" }),
    ).rejects.toMatchObject({ statusCode: 400, referenceKind: "pipeline" });
  });
});
