import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockUpdate = vi.fn();
const mockFindDefaultPipeline = vi.fn();
const mockFindPipelineById = vi.fn();
const mockFindMemberByPhone = vi.fn();
const mockCreateMember = vi.fn();
const mockFindContactById = vi.fn();
const mockFindCompanyByName = vi.fn();
const mockCreateCompany = vi.fn();
const mockCreateContact = vi.fn();
const mockCreateDeal = vi.fn();
const mockMarkLeadConverted = vi.fn();
const mockFindLeadByIdWithDeal = vi.fn();
const mockCreateNotification = vi.fn();
const mockPublishDomainEvent = vi.fn();

vi.mock("./lead.repository", () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findAll: vi.fn(),
    update: (...args: unknown[]) => mockUpdate(...args),
    softDelete: vi.fn(),
    findDefaultPipeline: (...args: unknown[]) =>
      mockFindDefaultPipeline(...args),
    findPipelineById: (...args: unknown[]) => mockFindPipelineById(...args),
    findMemberByPhone: (...args: unknown[]) => mockFindMemberByPhone(...args),
    createMember: (...args: unknown[]) => mockCreateMember(...args),
    findContactById: (...args: unknown[]) => mockFindContactById(...args),
    findCompanyByName: (...args: unknown[]) => mockFindCompanyByName(...args),
    createCompany: (...args: unknown[]) => mockCreateCompany(...args),
    createContact: (...args: unknown[]) => mockCreateContact(...args),
    createDeal: (...args: unknown[]) => mockCreateDeal(...args),
    markLeadConverted: (...args: unknown[]) => mockMarkLeadConverted(...args),
    findLeadByIdWithDeal: (...args: unknown[]) =>
      mockFindLeadByIdWithDeal(...args),
    createNotification: (...args: unknown[]) => mockCreateNotification(...args),
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

import { LeadService } from "./lead.service";

const leadService = new LeadService();

describe("LeadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("publishes automation event after creating a lead", async () => {
      mockCreate.mockResolvedValue({
        id: "l1",
        name: "Jane",
        email: "jane@example.com",
        phone: "+1234567890",
        companyName: "Acme",
        status: "NEW",
        source: "Website",
        assignedToId: "u1",
      });

      const result = await leadService.create("t1", "u1", { name: "Jane" });

      expect(result).toEqual(
        expect.objectContaining({ id: "l1", name: "Jane" }),
      );
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "crm.lead.created",
          entityType: "LEAD",
          entityId: "l1",
          actorUserId: "u1",
        }),
      );
    });
  });

  describe("getById", () => {
    it("returns lead when found", async () => {
      const lead = { id: "l1", name: "Jane", tenantId: "t1" };
      mockFindById.mockResolvedValue(lead);

      const result = await leadService.getById("t1", "l1");
      expect(result).toEqual(lead);
    });

    it("throws 404 when lead not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(leadService.getById("t1", "missing")).rejects.toMatchObject(
        createError("Lead not found", 404),
      );
    });
  });

  describe("assign", () => {
    it("publishes automation event after assigning a lead", async () => {
      mockFindById.mockResolvedValue({
        id: "l1",
        assignedToId: "u1",
      });
      mockUpdate.mockResolvedValue({
        id: "l1",
        name: "Jane",
        assignedToId: "u2",
        status: "NEW",
      });

      const result = await leadService.assign("t1", "u1", "l1", {
        assignedToId: "u2",
      });

      expect(result).toEqual(expect.objectContaining({ id: "l1" }));
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "crm.lead.assigned",
          entityType: "LEAD",
          entityId: "l1",
          actorUserId: "u1",
        }),
      );
    });
  });

  describe("convert", () => {
    it("publishes automation event after converting a lead", async () => {
      mockFindById.mockResolvedValue({
        id: "l1",
        name: "Jane Doe",
        phone: "+1234567890",
        email: "jane@example.com",
        companyName: "Acme",
        status: "NEW",
        assignedToId: "u2",
      });
      mockFindDefaultPipeline.mockResolvedValue({
        id: "pipe-1",
        stages: [{ id: "stage-1", name: "Qualification" }],
      });
      mockFindMemberByPhone.mockResolvedValue({ id: "member-1" });
      mockFindCompanyByName.mockResolvedValue({ id: "company-1" });
      mockCreateContact.mockResolvedValue({
        id: "contact-1",
        companyId: "company-1",
      });
      mockCreateDeal.mockResolvedValue({
        id: "deal-1",
        pipelineId: "pipe-1",
      });
      mockMarkLeadConverted.mockResolvedValue(undefined);
      mockFindLeadByIdWithDeal.mockResolvedValue({
        id: "l1",
        status: "CONVERTED",
      });

      const result = await leadService.convert("t1", "u1", "l1", {});

      expect(result).toEqual(
        expect.objectContaining({
          contact: expect.objectContaining({ id: "contact-1" }),
          deal: expect.objectContaining({ id: "deal-1" }),
        }),
      );
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "crm.lead.converted",
          entityType: "LEAD",
          entityId: "l1",
          actorUserId: "u1",
        }),
      );
    });
  });
});
