import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemberService } from "./member.service";
import type { MemberRepository } from "./member.repository";

const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindExistingByPhone = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdWithSales = vi.fn();
const mockFindExistingById = vi.fn();
const mockUpdate = vi.fn();
const mockCheckMember = vi.fn();
const mockFindForExport = vi.fn();

const mockRepo: MemberRepository = {
  create: mockCreate,
  findAll: mockFindAll,
  findExistingByPhone: mockFindExistingByPhone,
  findById: mockFindById,
  findByIdWithSales: mockFindByIdWithSales,
  findExistingById: mockFindExistingById,
  update: mockUpdate,
  checkMember: mockCheckMember,
  findForExport: mockFindForExport,
} as unknown as MemberRepository;

const memberService = new MemberService(mockRepo);

describe("MemberService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates member when phone does not exist", async () => {
      mockFindExistingByPhone.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "m1",
        phone: "+1234567890",
        name: "Alice",
      });

      const result = await memberService.create("t1", {
        phone: "+1234567890",
        name: "Alice",
      });

      expect(result.member).toEqual({
        id: "m1",
        phone: "+1234567890",
        name: "Alice",
      });
      expect(result.existing).toBeNull();
      expect(mockCreate).toHaveBeenCalledWith({
        tenantId: "t1",
        phone: "+1234567890",
        name: "Alice",
        email: null,
        notes: null,
      });
    });

    it("returns existing when phone already exists", async () => {
      const existing = { id: "m0", phone: "+1234567890", name: "Bob" };
      mockFindExistingByPhone.mockResolvedValue(existing);

      const result = await memberService.create("t1", {
        phone: "+1234567890",
        name: "Alice",
      });

      expect(result.existing).toEqual(existing);
      expect(result.member).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns member when found", async () => {
      const member = { id: "m1", phone: "+1", name: "Alice" };
      mockFindByIdWithSales.mockResolvedValue(member);

      const result = await memberService.findById("t1", "m1");
      expect(result).toEqual(member);
      expect(mockFindByIdWithSales).toHaveBeenCalledWith("t1", "m1");
    });
  });

  describe("update", () => {
    it("updates member when found and no conflict", async () => {
      mockFindById.mockResolvedValue({
        id: "m1",
        phone: "+1",
        name: "Alice",
      });
      mockFindExistingByPhone.mockResolvedValue(null);
      mockUpdate.mockResolvedValue({
        id: "m1",
        phone: "+1",
        name: "Alice Updated",
      });

      const result = await memberService.update("t1", "m1", {
        name: "Alice Updated",
      });
      expect(result?.conflict).toBe(false);
      expect(result?.member.name).toBe("Alice Updated");
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns null when member not found", async () => {
      mockFindById.mockResolvedValue(null);

      const result = await memberService.update("t1", "missing", { name: "X" });
      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
