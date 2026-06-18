import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSequencesByContact,
  getSequencesByDeal,
  RemarketingSequence,
} from "./remarketing.service";

const mockGet = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe("remarketing.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets sequences by contact with valid id", async () => {
    const mockSequences: RemarketingSequence[] = [
      {
        id: "seq1",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: "deal1",
        sequenceDay: 1,
        message: "Follow-up message",
        scheduledAt: "2026-06-20T10:00:00Z",
        executedAt: null,
        status: "PENDING",
        createdAt: "2026-06-19T10:00:00Z",
      },
    ];
    mockGet.mockResolvedValue({ data: { sequences: mockSequences } });

    const result = await getSequencesByContact("contact1");

    expect(mockGet).toHaveBeenCalledWith(
      "/contacts/contact1/remarketing-sequences",
    );
    expect(result).toEqual(mockSequences);
    expect(result).toHaveLength(1);
  });

  it("gets sequences by deal with valid id", async () => {
    const mockSequences: RemarketingSequence[] = [
      {
        id: "seq2",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: "deal1",
        sequenceDay: 2,
        message: "Another follow-up",
        scheduledAt: "2026-06-21T10:00:00Z",
        executedAt: "2026-06-21T10:05:00Z",
        status: "EXECUTED",
        createdAt: "2026-06-19T10:00:00Z",
      },
    ];
    mockGet.mockResolvedValue({ data: { sequences: mockSequences } });

    const result = await getSequencesByDeal("deal1");

    expect(mockGet).toHaveBeenCalledWith("/deals/deal1/remarketing-sequences");
    expect(result).toEqual(mockSequences);
  });

  it("returns empty array when sequences field is null or undefined", async () => {
    mockGet.mockResolvedValue({ data: { sequences: null } });

    const result = await getSequencesByContact("contact1");

    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledWith(
      "/contacts/contact1/remarketing-sequences",
    );
  });

  it("returns empty array when API returns no sequences", async () => {
    mockGet.mockResolvedValue({ data: { sequences: [] } });

    const result = await getSequencesByDeal("deal1");

    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledWith("/deals/deal1/remarketing-sequences");
  });

  it("handles multiple sequences with different statuses", async () => {
    const mockSequences: RemarketingSequence[] = [
      {
        id: "seq1",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: null,
        sequenceDay: 1,
        message: "First message",
        scheduledAt: "2026-06-20T10:00:00Z",
        executedAt: null,
        status: "PENDING",
        createdAt: "2026-06-19T10:00:00Z",
      },
      {
        id: "seq2",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: null,
        sequenceDay: 2,
        message: null,
        scheduledAt: "2026-06-21T10:00:00Z",
        executedAt: "2026-06-21T10:05:00Z",
        status: "EXECUTED",
        createdAt: "2026-06-19T10:00:00Z",
      },
      {
        id: "seq3",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: null,
        sequenceDay: 3,
        message: "Third message",
        scheduledAt: "2026-06-22T10:00:00Z",
        executedAt: null,
        status: "SKIPPED",
        createdAt: "2026-06-19T10:00:00Z",
      },
      {
        id: "seq4",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: null,
        sequenceDay: 4,
        message: "Fourth message",
        scheduledAt: "2026-06-23T10:00:00Z",
        executedAt: null,
        status: "PAUSED",
        createdAt: "2026-06-19T10:00:00Z",
      },
    ];
    mockGet.mockResolvedValue({ data: { sequences: mockSequences } });

    const result = await getSequencesByContact("contact1");

    expect(result).toHaveLength(4);
    expect(result[0]!.status).toBe("PENDING");
    expect(result[1]!.status).toBe("EXECUTED");
    expect(result[2]!.status).toBe("SKIPPED");
    expect(result[3]!.status).toBe("PAUSED");
  });

  it("builds correct URL with special characters in contact id", async () => {
    mockGet.mockResolvedValue({ data: { sequences: [] } });

    await getSequencesByContact("contact-123_abc");

    expect(mockGet).toHaveBeenCalledWith(
      "/contacts/contact-123_abc/remarketing-sequences",
    );
  });

  it("builds correct URL with special characters in deal id", async () => {
    mockGet.mockResolvedValue({ data: { sequences: [] } });

    await getSequencesByDeal("deal-456_xyz");

    expect(mockGet).toHaveBeenCalledWith(
      "/deals/deal-456_xyz/remarketing-sequences",
    );
  });

  it("handles API rejection with network error", async () => {
    const error = new Error("Network connection failed");
    mockGet.mockRejectedValue(error);

    await expect(getSequencesByContact("contact1")).rejects.toThrow(
      "Network connection failed",
    );
  });

  it("propagates API errors for deal sequences", async () => {
    const error = new Error("Unauthorized");
    mockGet.mockRejectedValue(error);

    await expect(getSequencesByDeal("deal1")).rejects.toThrow("Unauthorized");
  });

  it("handles sequences with null dealId in contact query", async () => {
    const mockSequences: RemarketingSequence[] = [
      {
        id: "seq1",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: null,
        sequenceDay: 1,
        message: "Message without deal",
        scheduledAt: "2026-06-20T10:00:00Z",
        executedAt: null,
        status: "PENDING",
        createdAt: "2026-06-19T10:00:00Z",
      },
    ];
    mockGet.mockResolvedValue({ data: { sequences: mockSequences } });

    const result = await getSequencesByContact("contact1");

    expect(result).toHaveLength(1);
    expect(result[0]!.dealId).toBeNull();
  });

  it("handles sequences with null message field", async () => {
    const mockSequences: RemarketingSequence[] = [
      {
        id: "seq1",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: "deal1",
        sequenceDay: 1,
        message: null,
        scheduledAt: "2026-06-20T10:00:00Z",
        executedAt: null,
        status: "PENDING",
        createdAt: "2026-06-19T10:00:00Z",
      },
    ];
    mockGet.mockResolvedValue({ data: { sequences: mockSequences } });

    const result = await getSequencesByContact("contact1");

    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBeNull();
  });

  it("handles sequences with executed timestamp", async () => {
    const mockSequences: RemarketingSequence[] = [
      {
        id: "seq1",
        tenantId: "tenant1",
        contactId: "contact1",
        dealId: "deal1",
        sequenceDay: 1,
        message: "Executed message",
        scheduledAt: "2026-06-20T10:00:00Z",
        executedAt: "2026-06-20T10:15:00Z",
        status: "EXECUTED",
        createdAt: "2026-06-19T10:00:00Z",
      },
    ];
    mockGet.mockResolvedValue({ data: { sequences: mockSequences } });

    const result = await getSequencesByContact("contact1");

    expect(result[0]!.executedAt).toBe("2026-06-20T10:15:00Z");
  });
});
