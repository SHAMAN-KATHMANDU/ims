import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMembers,
  getMemberById,
  createMember,
  checkMember,
} from "./member.service";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("member.service", () => {
  describe("getMembers", () => {
    it("calls GET /members with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      });

      await getMembers({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/members"));
    });
  });

  describe("getMemberById", () => {
    it("calls GET /members/:id", async () => {
      mockGet.mockResolvedValue({
        data: { member: { id: "m1", phone: "123", name: "Test" } },
      });

      await getMemberById("m1");

      expect(mockGet).toHaveBeenCalledWith("/members/m1");
    });
  });

  describe("createMember", () => {
    it("calls POST /members with payload", async () => {
      mockPost.mockResolvedValue({
        data: { member: { id: "m1", phone: "123", name: "Test" } },
      });

      await createMember({ phone: "123", name: "Test" });

      expect(mockPost).toHaveBeenCalledWith(
        "/members",
        expect.objectContaining({ phone: "123", name: "Test" }),
      );
    });
  });

  describe("checkMember", () => {
    it("returns isMember: false when API errors", async () => {
      mockGet.mockRejectedValue(new Error("Not found"));

      const result = await checkMember("999");

      expect(result).toEqual({ isMember: false, member: null });
    });
  });
});
