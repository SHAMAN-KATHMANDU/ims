import { describe, expect, it } from "vitest";
import { getActiveJourneyType } from "./journey-type";

describe("getActiveJourneyType", () => {
  it("formats the active deal as Pipeline(stage)", () => {
    expect(
      getActiveJourneyType([
        {
          stage: "Lead",
          status: "OPEN",
          pipeline: { name: "New Sales" },
        },
      ]),
    ).toBe("New Sales(Lead)");
  });

  it("ignores closed deals", () => {
    expect(
      getActiveJourneyType([
        {
          stage: "Won",
          status: "WON",
          pipeline: { name: "New Sales" },
        },
      ]),
    ).toBeNull();
  });
});
