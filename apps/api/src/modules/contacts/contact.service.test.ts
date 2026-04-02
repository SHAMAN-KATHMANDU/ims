import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockUpdate = vi.fn();
const mockGetAfterUpdate = vi.fn();
const mockSoftDelete = vi.fn();
const mockFindTags = vi.fn();
const mockFindTagsPaginated = vi.fn();
const mockCountTags = vi.fn();
const mockCreateTag = vi.fn();
const mockAddNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockAddCommunication = vi.fn();
const mockPublishDomainEvent = vi.fn();

vi.mock("./contact.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findAll: (...args: unknown[]) => mockFindAll(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    getAfterUpdate: (...args: unknown[]) => mockGetAfterUpdate(...args),
    softDelete: (...args: unknown[]) => mockSoftDelete(...args),
    findTags: (...args: unknown[]) => mockFindTags(...args),
    findTagsPaginated: (...args: unknown[]) => mockFindTagsPaginated(...args),
    countTags: (...args: unknown[]) => mockCountTags(...args),
    createTag: (...args: unknown[]) => mockCreateTag(...args),
    addNote: (...args: unknown[]) => mockAddNote(...args),
    deleteNote: (...args: unknown[]) => mockDeleteNote(...args),
    addCommunication: (...args: unknown[]) => mockAddCommunication(...args),
  },
}));

vi.mock("@/utils/phone", () => ({
  normalizePhoneOptional: (phone: string) => {
    if (phone === "invalid") throw new Error("Invalid phone");
    return `+${phone.replace(/\D/g, "")}`;
  },
}));

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../tasks/task.repository", () => ({
  default: {
    completeManyByContactId: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) =>
      Promise.resolve(mockPublishDomainEvent(...args)),
  },
}));

import contactService from "./contact.service";

describe("ContactService", () => {
  const tenantId = "t1";
  const userId = "u1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates contact and normalizes phone", async () => {
      const created = { id: "c1", firstName: "John", lastName: "Doe" };
      mockCreate.mockResolvedValue(created);

      const result = await contactService.create(
        tenantId,
        { firstName: "John", lastName: "Doe", phone: "1234567890" },
        userId,
      );

      expect(result).toEqual(created);
      expect(mockCreate).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ firstName: "John", lastName: "Doe" }),
        userId,
        "+1234567890",
      );
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "crm.contact.created",
          entityType: "CONTACT",
          entityId: "c1",
          actorUserId: userId,
        }),
      );
    });

    it("throws 400 on invalid phone", async () => {
      await expect(
        contactService.create(
          tenantId,
          { firstName: "John", phone: "invalid" },
          userId,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    it("returns paginated contacts", async () => {
      const data = { data: [], pagination: {} };
      mockFindAll.mockResolvedValue(data);

      const result = await contactService.getAll(tenantId, { page: 1 });

      expect(result).toEqual(data);
      expect(mockFindAll).toHaveBeenCalledWith(tenantId, { page: 1 });
    });
  });

  describe("getById", () => {
    it("returns contact when found", async () => {
      const contact = { id: "c1", firstName: "John" };
      mockFindById.mockResolvedValue(contact);

      const result = await contactService.getById(tenantId, "c1");

      expect(result).toEqual(expect.objectContaining(contact));
    });

    it("throws 404 when contact not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        contactService.getById(tenantId, "missing"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Contact not found",
      });
    });

    it("derives journey type from the active deal context", async () => {
      mockFindById.mockResolvedValue({
        id: "c1",
        firstName: "John",
        journeyType: "Legacy",
        deals: [
          {
            stage: "Lead",
            status: "OPEN",
            pipeline: { name: "New Sales" },
          },
        ],
      });

      const result = await contactService.getById(tenantId, "c1");

      expect(result).toEqual(
        expect.objectContaining({ journeyType: "New Sales(Lead)" }),
      );
    });
  });

  describe("update", () => {
    it("updates contact and returns refreshed", async () => {
      const existing = { id: "c1" };
      const updated = {
        id: "c1",
        firstName: "Jane",
        updatedAt: new Date("2024-06-15T00:00:00.000Z"),
      };
      mockFindById.mockResolvedValue(existing);
      mockGetAfterUpdate.mockResolvedValue(updated);

      const result = await contactService.update(tenantId, "c1", {
        firstName: "Jane",
      });

      expect(result).toEqual(updated);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "crm.contact.updated",
          entityType: "CONTACT",
          entityId: "c1",
        }),
      );
    });

    it("throws 404 when contact not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        contactService.update(tenantId, "missing", { firstName: "Jane" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Contact not found",
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("soft-deletes contact", async () => {
      mockFindById.mockResolvedValue({ id: "c1" });

      await contactService.delete(tenantId, "c1", { userId: "u1" });

      expect(mockSoftDelete).toHaveBeenCalledWith("c1", {
        deletedBy: "u1",
        deleteReason: null,
      });
    });

    it("throws 404 when contact not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        contactService.delete(tenantId, "missing", { userId: "u1" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Contact not found",
      });

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });

  describe("getTags", () => {
    it("returns tags when no pagination", async () => {
      const tags = [{ id: "t1", name: "VIP" }];
      mockFindTags.mockResolvedValue(tags);

      const result = await contactService.getTags(tenantId);

      expect(result).toEqual({ tags });
    });

    it("returns tags and pagination when page and limit provided", async () => {
      const tags = [{ id: "t1", name: "VIP" }];
      mockFindTagsPaginated.mockResolvedValue(tags);
      mockCountTags.mockResolvedValue(1);

      const result = await contactService.getTags(tenantId, {
        page: 1,
        limit: 10,
      });

      expect(result.tags).toEqual(tags);
      expect(result.pagination).toBeDefined();
      expect(result.pagination?.totalItems).toBe(1);
      expect(result.pagination?.currentPage).toBe(1);
    });
  });

  describe("createTag", () => {
    it("creates tag with trimmed name", async () => {
      const tag = { id: "t1", name: "VIP" };
      mockCreateTag.mockResolvedValue(tag);

      await contactService.createTag(tenantId, "  VIP  ");

      expect(mockCreateTag).toHaveBeenCalledWith(tenantId, "VIP");
    });
  });

  describe("addNote", () => {
    it("adds note when contact exists", async () => {
      mockFindById.mockResolvedValue({ id: "c1" });
      const note = { id: "n1", content: "Called" };
      mockAddNote.mockResolvedValue(note);

      const result = await contactService.addNote(
        tenantId,
        "c1",
        { content: "Called" },
        userId,
      );

      expect(result).toEqual(note);
      expect(mockAddNote).toHaveBeenCalledWith("c1", "Called", userId);
    });

    it("throws 404 when contact not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        contactService.addNote(tenantId, "missing", { content: "x" }, userId),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Contact not found",
      });
    });
  });

  describe("addCommunication", () => {
    it("adds communication when contact exists", async () => {
      mockFindById.mockResolvedValue({ id: "c1" });
      const comm = { id: "com1", type: "EMAIL" };
      mockAddCommunication.mockResolvedValue(comm);

      const result = await contactService.addCommunication(
        tenantId,
        "c1",
        { type: "EMAIL", subject: "Hi" },
        userId,
      );

      expect(result).toEqual(comm);
    });

    it("throws 404 when contact not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        contactService.addCommunication(
          tenantId,
          "missing",
          { type: "EMAIL" },
          userId,
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Contact not found",
      });
    });
  });
});
