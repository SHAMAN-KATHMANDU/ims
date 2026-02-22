import { describe, it, expect } from "vitest";
import {
  cancelTransferSchema,
  createTransferSchema,
  transferIdParamsSchema,
  transferListQuerySchema,
} from "./transfer.schema";

describe("transfer schemas", () => {
  it("validates createTransferSchema with item payload", () => {
    const parsed = createTransferSchema.parse({
      fromLocationId: "loc-a",
      toLocationId: "loc-b",
      items: [{ variationId: "var-1", quantity: 2 }],
      notes: "  urgent ",
    });

    expect(parsed.notes).toBe("urgent");
    expect(parsed.items[0]?.quantity).toBe(2);
  });

  it("rejects transfer when source and destination are same", () => {
    const result = createTransferSchema.safeParse({
      fromLocationId: "loc-a",
      toLocationId: "loc-a",
      items: [{ variationId: "var-1", quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid item quantity", () => {
    const result = createTransferSchema.safeParse({
      fromLocationId: "loc-a",
      toLocationId: "loc-b",
      items: [{ variationId: "var-1", quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("validates cancelTransferSchema and trims reason", () => {
    const parsed = cancelTransferSchema.parse({ reason: "  mismatch " });
    expect(parsed.reason).toBe("mismatch");
  });

  it("validates transfer path/query schemas", () => {
    const idParsed = transferIdParamsSchema.parse({ id: "transfer-1" });
    const queryParsed = transferListQuerySchema.parse({
      status: "PENDING",
      page: "1",
      limit: "20",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(idParsed.id).toBe("transfer-1");
    expect(queryParsed.status).toBe("PENDING");
    expect(queryParsed.page).toBe(1);
    expect(queryParsed.limit).toBe(20);
  });
});
