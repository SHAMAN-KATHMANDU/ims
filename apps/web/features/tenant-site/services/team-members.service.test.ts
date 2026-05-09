import { describe, it, expect, vi, beforeEach } from "vitest";
import { teamMembersService } from "./team-members.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((error) => {
    throw new Error(error?.response?.data?.message || "API error");
  }),
}));

import api from "@/lib/axios";

describe("teamMembersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listMembers", () => {
    it("returns list of members on success", async () => {
      const mockMembers = [
        {
          id: "m1",
          tenantId: "t1",
          email: "user@example.com",
          role: "admin" as const,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];
      vi.mocked(api.get).mockResolvedValue({
        data: { members: mockMembers },
      });

      const result = await teamMembersService.listMembers();

      expect(result).toHaveLength(1);
      expect(result[0]?.email).toBe("user@example.com");
      expect(vi.mocked(api.get)).toHaveBeenCalledWith("/members");
    });

    it("handles API error on listMembers", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

      await expect(teamMembersService.listMembers()).rejects.toThrow();
    });
  });

  describe("inviteMember", () => {
    it("invites a member and returns it", async () => {
      const payload = { email: "newuser@example.com", role: "user" as const };
      const mockMember = {
        id: "m2",
        tenantId: "t1",
        email: "newuser@example.com",
        role: "user",
        invitedAt: "2024-01-02T00:00:00Z",
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      vi.mocked(api.post).mockResolvedValue({
        data: { member: mockMember },
      });

      const result = await teamMembersService.inviteMember(payload);

      expect(result.email).toBe("newuser@example.com");
      expect(result.role).toBe("user");
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/members", payload);
    });

    it("handles duplicate email error", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("Member already exists"));

      await expect(
        teamMembersService.inviteMember({
          email: "existing@example.com",
          role: "user",
        }),
      ).rejects.toThrow();
    });
  });

  describe("updateMemberRole", () => {
    it("updates a member role and returns it", async () => {
      const payload = { role: "admin" as const };
      const mockMember = {
        id: "m1",
        tenantId: "t1",
        email: "user@example.com",
        role: "admin",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      vi.mocked(api.patch).mockResolvedValue({
        data: { member: mockMember },
      });

      const result = await teamMembersService.updateMemberRole("m1", payload);

      expect(result.role).toBe("admin");
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith("/members/m1", payload);
    });
  });

  describe("removeMember", () => {
    it("removes a member", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await teamMembersService.removeMember("m1");

      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/members/m1");
    });

    it("handles not found error", async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error("Member not found"));

      await expect(
        teamMembersService.removeMember("nonexistent"),
      ).rejects.toThrow();
    });
  });
});
