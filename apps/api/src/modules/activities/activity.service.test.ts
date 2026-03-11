import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindByContact = vi.fn();
const mockFindByDeal = vi.fn();
const mockFindById = vi.fn();
const mockSoftDelete = vi.fn();

vi.mock("./activity.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findByContact: (...args: unknown[]) => mockFindByContact(...args),
    findByDeal: (...args: unknown[]) => mockFindByDeal(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    softDelete: (...args: unknown[]) => mockSoftDelete(...args),
  },
}));

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import activityService from "./activity.service";

describe("ActivityService", () => {
  const tenantId = "t1";
  const userId = "u1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates activity with provided data and defaults activityAt to now", async () => {
      const created = {
        id: "a1",
        type: "CALL",
        subject: "Follow-up",
        contactId: "c1",
        tenantId,
        createdById: userId,
      };
      mockCreate.mockResolvedValue(created);

      const result = await activityService.create(tenantId, userId, {
        type: "CALL",
        subject: "Follow-up",
        contactId: "c1",
      });

      expect(result).toEqual(created);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          type: "CALL",
          subject: "Follow-up",
          contactId: "c1",
          createdById: userId,
        }),
      );
    });

    it("uses provided activityAt when given", async () => {
      const activityAt = "2024-01-15T10:00:00Z";
      mockCreate.mockResolvedValue({ id: "a1" });

      await activityService.create(tenantId, userId, {
        type: "MEETING",
        contactId: "c1",
        activityAt,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          activityAt: new Date(activityAt),
        }),
      );
    });
  });

  describe("getByContact", () => {
    it("returns activities for contact", async () => {
      const activities = [{ id: "a1", contactId: "c1" }];
      mockFindByContact.mockResolvedValue(activities);

      const result = await activityService.getByContact(tenantId, "c1");

      expect(result).toEqual(activities);
      expect(mockFindByContact).toHaveBeenCalledWith(tenantId, "c1");
    });
  });

  describe("getByDeal", () => {
    it("returns activities for deal", async () => {
      const activities = [{ id: "a1", dealId: "d1" }];
      mockFindByDeal.mockResolvedValue(activities);

      const result = await activityService.getByDeal(tenantId, "d1");

      expect(result).toEqual(activities);
      expect(mockFindByDeal).toHaveBeenCalledWith(tenantId, "d1");
    });
  });

  describe("getById", () => {
    it("returns activity when found", async () => {
      const activity = { id: "a1", type: "CALL" };
      mockFindById.mockResolvedValue(activity);

      const result = await activityService.getById(tenantId, "a1");

      expect(result).toEqual(activity);
    });

    it("throws 404 when activity not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        activityService.getById(tenantId, "missing"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Activity not found",
      });
    });
  });

  describe("delete", () => {
    it("soft-deletes activity and creates audit log", async () => {
      const existing = { id: "a1", tenantId };
      mockFindById.mockResolvedValue(existing);
      mockSoftDelete.mockResolvedValue(undefined);

      await activityService.delete(tenantId, "a1", { userId: "u1" });

      expect(mockSoftDelete).toHaveBeenCalledWith("a1", {
        deletedBy: "u1",
        deleteReason: null,
      });
    });

    it("throws 404 when activity not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        activityService.delete(tenantId, "missing", { userId: "u1" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Activity not found",
      });

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });
});
