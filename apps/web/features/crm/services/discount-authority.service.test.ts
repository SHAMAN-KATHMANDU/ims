import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkDiscountAuthority,
  type DiscountAuthorityResult,
} from "./discount-authority.service";

const mockPost = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe("discount-authority.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks discount authority for auto-approved discount", async () => {
    const mockResult: DiscountAuthorityResult = {
      authority: "AUTO_APPROVED",
      reason:
        "Customer has high purchase history and discount is within limits",
      maxAutoApprovePercent: 20,
    };
    mockPost.mockResolvedValue({ data: mockResult });

    const result = await checkDiscountAuthority({
      pipelineType: "NEW_SALES",
      purchaseCount: 10,
      discountPercent: 15,
    });

    expect(mockPost).toHaveBeenCalledWith("/deals/check-discount", {
      pipelineType: "NEW_SALES",
      purchaseCount: 10,
      discountPercent: 15,
    });
    expect(result).toEqual(mockResult);
    expect(result.authority).toBe("AUTO_APPROVED");
  });

  it("checks discount authority for human review case", async () => {
    const mockResult: DiscountAuthorityResult = {
      authority: "HUMAN_REVIEW",
      reason: "Discount exceeds auto-approval threshold for this pipeline",
      maxAutoApprovePercent: 10,
    };
    mockPost.mockResolvedValue({ data: mockResult });

    const result = await checkDiscountAuthority({
      pipelineType: "REPURCHASE",
      purchaseCount: 5,
      discountPercent: 25,
    });

    expect(result.authority).toBe("HUMAN_REVIEW");
    expect(result.maxAutoApprovePercent).toBe(10);
  });

  it("checks discount authority for blocked case", async () => {
    const mockResult: DiscountAuthorityResult = {
      authority: "BLOCKED",
      reason: "Customer marked for no discounts",
      maxAutoApprovePercent: 0,
    };
    mockPost.mockResolvedValue({ data: mockResult });

    const result = await checkDiscountAuthority({
      pipelineType: "GENERAL",
      purchaseCount: 0,
      discountPercent: 5,
    });

    expect(result.authority).toBe("BLOCKED");
    expect(result.maxAutoApprovePercent).toBe(0);
  });

  it("handles zero purchase count (new customer)", async () => {
    const mockResult: DiscountAuthorityResult = {
      authority: "AUTO_APPROVED",
      reason: "New customer eligible for introductory discount",
      maxAutoApprovePercent: 10,
    };
    mockPost.mockResolvedValue({ data: mockResult });

    const result = await checkDiscountAuthority({
      pipelineType: "NEW_SALES",
      purchaseCount: 0,
      discountPercent: 5,
    });

    expect(mockPost).toHaveBeenCalledWith("/deals/check-discount", {
      pipelineType: "NEW_SALES",
      purchaseCount: 0,
      discountPercent: 5,
    });
    expect(result.authority).toBe("AUTO_APPROVED");
  });

  it("handles maximum discount percentage", async () => {
    const mockResult: DiscountAuthorityResult = {
      authority: "BLOCKED",
      reason: "Discount percentage exceeds system maximum",
      maxAutoApprovePercent: 50,
    };
    mockPost.mockResolvedValue({ data: mockResult });

    const result = await checkDiscountAuthority({
      pipelineType: "REMARKETING",
      purchaseCount: 20,
      discountPercent: 100,
    });

    expect(result.authority).toBe("BLOCKED");
    expect(result.reason).toContain("system maximum");
  });

  it("handles different pipeline types correctly", async () => {
    const pipelineTypes = [
      "GENERAL",
      "NEW_SALES",
      "REMARKETING",
      "REPURCHASE",
    ] as const;

    for (const pipelineType of pipelineTypes) {
      mockPost.mockResolvedValue({
        data: {
          authority: "AUTO_APPROVED",
          reason: `Approved for ${pipelineType}`,
          maxAutoApprovePercent: 15,
        },
      });

      const result = await checkDiscountAuthority({
        pipelineType,
        purchaseCount: 5,
        discountPercent: 10,
      });

      expect(mockPost).toHaveBeenLastCalledWith("/deals/check-discount", {
        pipelineType,
        purchaseCount: 5,
        discountPercent: 10,
      });
      expect(result.authority).toBe("AUTO_APPROVED");
    }
  });

  it("unwraps nested response data correctly", async () => {
    const mockResult: DiscountAuthorityResult = {
      authority: "AUTO_APPROVED",
      reason: "Within authority limits",
      maxAutoApprovePercent: 20,
    };
    mockPost.mockResolvedValue({
      data: mockResult,
      status: 200,
      statusText: "OK",
    });

    const result = await checkDiscountAuthority({
      pipelineType: "NEW_SALES",
      purchaseCount: 1,
      discountPercent: 5,
    });

    expect(result).toEqual(mockResult);
    expect(result.authority).toBeDefined();
    expect(result.reason).toBeDefined();
    expect(result.maxAutoApprovePercent).toBeDefined();
  });

  it("propagates API errors correctly", async () => {
    const error = new Error("API request failed");
    mockPost.mockRejectedValue(error);

    await expect(
      checkDiscountAuthority({
        pipelineType: "NEW_SALES",
        purchaseCount: 5,
        discountPercent: 10,
      }),
    ).rejects.toThrow("API request failed");
  });
});
