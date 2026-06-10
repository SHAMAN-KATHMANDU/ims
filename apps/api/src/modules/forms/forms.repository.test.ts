import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/prisma", () => ({
  default: {
    form: {
      findFirst: vi.fn(),
    },
    formSubmission: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import prisma from "@/config/prisma";
import formsRepository from "./forms.repository";

const mockPrisma = prisma as unknown as {
  form: { findFirst: ReturnType<typeof vi.fn> };
  formSubmission: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("FormsRepository.listSubmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.form.findFirst.mockResolvedValue({ id: "f1", tenantId: "t1" });
    mockPrisma.formSubmission.findMany.mockResolvedValue([]);
    mockPrisma.formSubmission.count.mockResolvedValue(0);
  });

  it("scopes the submission query by tenantId AND formId", async () => {
    await formsRepository.listSubmissions("t1", "f1");

    expect(mockPrisma.formSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { formId: "f1", tenantId: "t1" },
      }),
    );
    expect(mockPrisma.formSubmission.count).toHaveBeenCalledWith({
      where: { formId: "f1", tenantId: "t1" },
    });
  });

  it("throws 404 before querying submissions when the form belongs to another tenant", async () => {
    mockPrisma.form.findFirst.mockResolvedValue(null);

    await expect(
      formsRepository.listSubmissions("t1", "other-tenants-form"),
    ).rejects.toThrow("Form not found");
    expect(mockPrisma.formSubmission.findMany).not.toHaveBeenCalled();
  });

  it("passes pagination through and returns submissions with total", async () => {
    const rows = [{ id: "s1" }, { id: "s2" }];
    mockPrisma.formSubmission.findMany.mockResolvedValue(rows);
    mockPrisma.formSubmission.count.mockResolvedValue(42);

    const result = await formsRepository.listSubmissions("t1", "f1", 10, 20);

    expect(mockPrisma.formSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
    expect(result).toEqual({ submissions: rows, total: 42 });
  });

  it("orders submissions newest first", async () => {
    await formsRepository.listSubmissions("t1", "f1");
    expect(mockPrisma.formSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });
});
