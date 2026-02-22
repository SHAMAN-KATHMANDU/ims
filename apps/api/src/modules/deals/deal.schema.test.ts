import { describe, it, expect } from "vitest";
import {
  createDealSchema,
  dealIdParamsSchema,
  dealListQuerySchema,
  dealPipelineQuerySchema,
  updateDealSchema,
  updateDealStageSchema,
} from "./deal.schema";

describe("deal schemas", () => {
  it("validates createDealSchema and trims name", () => {
    const parsed = createDealSchema.parse({
      name: "  Big Deal ",
      value: "1200",
      probability: "80",
      status: "OPEN",
    });

    expect(parsed.name).toBe("Big Deal");
    expect(parsed.value).toBe(1200);
    expect(parsed.probability).toBe(80);
  });

  it("rejects empty deal name", () => {
    const result = createDealSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("validates updateDealSchema for partial updates", () => {
    const parsed = updateDealSchema.parse({
      lostReason: "  Price mismatch ",
      status: "LOST",
    });

    expect(parsed.lostReason).toBe("Price mismatch");
    expect(parsed.status).toBe("LOST");
  });

  it("rejects out-of-range probability", () => {
    const result = updateDealSchema.safeParse({ probability: 120 });
    expect(result.success).toBe(false);
  });

  it("validates updateDealStageSchema", () => {
    const parsed = updateDealStageSchema.parse({ stage: "  Negotiation " });
    expect(parsed.stage).toBe("Negotiation");
  });

  it("validates deal params and query schemas", () => {
    const params = dealIdParamsSchema.parse({ id: "deal-1" });
    const listQuery = dealListQuerySchema.parse({
      status: "OPEN",
      page: "2",
      limit: "30",
    });
    const pipelineQuery = dealPipelineQuerySchema.parse({
      pipelineId: "pipe-1",
    });

    expect(params.id).toBe("deal-1");
    expect(listQuery.status).toBe("OPEN");
    expect(listQuery.page).toBe(2);
    expect(pipelineQuery.pipelineId).toBe("pipe-1");
  });
});
