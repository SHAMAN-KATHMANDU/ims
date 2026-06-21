import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetContacts = vi.fn();
const mockGetContactById = vi.fn();
const mockCreateContact = vi.fn();
const mockUpdateContact = vi.fn();
const mockDeleteContact = vi.fn();
const mockGetContactTags = vi.fn();
const mockCreateContactTag = vi.fn();
const mockUpdateContactTag = vi.fn();
const mockDeleteContactTag = vi.fn();
const mockAddContactNote = vi.fn();
const mockDeleteContactNote = vi.fn();
const mockAddContactAttachment = vi.fn();
const mockDeleteContactAttachment = vi.fn();
const mockAddContactCommunication = vi.fn();
const mockImportContactsCsv = vi.fn();
const mockExportContactsCsv = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/contact.service", () => ({
  getContacts: (...args: unknown[]) => mockGetContacts(...args),
  getContactById: (...args: unknown[]) => mockGetContactById(...args),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  updateContact: (...args: unknown[]) => mockUpdateContact(...args),
  deleteContact: (...args: unknown[]) => mockDeleteContact(...args),
  getContactTags: (...args: unknown[]) => mockGetContactTags(...args),
  createContactTag: (...args: unknown[]) => mockCreateContactTag(...args),
  updateContactTag: (...args: unknown[]) => mockUpdateContactTag(...args),
  deleteContactTag: (...args: unknown[]) => mockDeleteContactTag(...args),
  addContactNote: (...args: unknown[]) => mockAddContactNote(...args),
  deleteContactNote: (...args: unknown[]) => mockDeleteContactNote(...args),
  addContactAttachment: (...args: unknown[]) =>
    mockAddContactAttachment(...args),
  deleteContactAttachment: (...args: unknown[]) =>
    mockDeleteContactAttachment(...args),
  addContactCommunication: (...args: unknown[]) =>
    mockAddContactCommunication(...args),
  importContactsCsv: (...args: unknown[]) => mockImportContactsCsv(...args),
  exportContactsCsv: (...args: unknown[]) => mockExportContactsCsv(...args),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

vi.mock("@/features/media", () => ({
  useS3DirectUpload: () => ({
    uploadFile: vi.fn(),
  }),
}));

vi.mock("./use-crm", () => ({
  crmKeys: {
    all: ["crm"] as const,
  },
}));

vi.mock("./use-tasks", () => ({
  taskKeys: {
    lists: () => ["tasks", "list"] as const,
  },
}));

vi.mock("./use-deals", () => ({
  dealKeys: {
    lists: () => ["deals", "list"] as const,
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useContactsPaginated,
  useContact,
  useContactTags,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useCreateContactTag,
  useUpdateContactTag,
  useDeleteContactTag,
  useAddContactNote,
  useDeleteContactNote,
  useAddContactAttachment,
  useDeleteContactAttachment,
  useAddContactCommunication,
  useImportContacts,
} from "./use-contacts";

describe("useContactsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetContacts.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch contacts with default pagination params when no params provided", async () => {
    const { result } = renderHook(() => useContactsPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetContacts).toHaveBeenCalledWith({});
  });

  it("should NOT fetch when CRM feature flag is disabled and fetchStatus should be idle", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useContactsPaginated(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetContacts).not.toHaveBeenCalled();
  });

  it("should NOT fetch when enabled option is false even if feature flag is true", async () => {
    mockUseFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useContactsPaginated({}, { enabled: false }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetContacts).not.toHaveBeenCalled();
  });

  it("should pass pagination params correctly to getContacts", async () => {
    const params = { page: 2, limit: 50, search: "John", sortBy: "name" };
    mockGetContacts.mockResolvedValue({
      data: [{ id: "c1", firstName: "John" }],
      pagination: { page: 2, limit: 50, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useContactsPaginated(params), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetContacts).toHaveBeenCalledWith(params);
  });
});

describe("useContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetContactById.mockResolvedValue({
      contact: { id: "c1", firstName: "John", lastName: "Doe" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch contact details when id is provided", async () => {
    const { result } = renderHook(() => useContact("c1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetContactById).toHaveBeenCalledWith("c1");
  });

  it("should NOT fetch when id is empty string", async () => {
    const { result } = renderHook(() => useContact(""), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetContactById).not.toHaveBeenCalled();
  });

  it("should NOT fetch when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useContact("c1"), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetContactById).not.toHaveBeenCalled();
  });

  it("should respect enabled:false option and not fetch", async () => {
    const { result } = renderHook(() => useContact("c1", { enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetContactById).not.toHaveBeenCalled();
  });
});

describe("useContactTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetContactTags.mockResolvedValue({
      tags: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch contact tags when feature is enabled", async () => {
    const { result } = renderHook(() => useContactTags(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetContactTags).toHaveBeenCalledWith(undefined);
  });

  it("should NOT fetch tags when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useContactTags(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetContactTags).not.toHaveBeenCalled();
  });
});

describe("useCreateContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateContact.mockResolvedValue({
      contact: { id: "c1", firstName: "John" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call createContact service with correct data shape", async () => {
    const createData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    };

    const { result } = renderHook(() => useCreateContact(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateContact).toHaveBeenCalledWith(createData);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateContact(), { wrapper });

    const createData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(createData);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useUpdateContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockUpdateContact.mockResolvedValue({
      contact: { id: "c1", firstName: "Jane" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateContact with id and data object shape", async () => {
    const { result } = renderHook(() => useUpdateContact(), { wrapper });

    const updatePayload = {
      id: "c1",
      data: { firstName: "Jane", lastName: "Smith" },
    };

    await act(async () => {
      await result.current.mutateAsync(updatePayload);
    });

    expect(mockUpdateContact).toHaveBeenCalledWith("c1", {
      firstName: "Jane",
      lastName: "Smith",
    });
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateContact(), { wrapper });

    const updatePayload = {
      id: "c1",
      data: { firstName: "Jane" },
    };

    await expect(
      act(async () => {
        await result.current.mutateAsync(updatePayload);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useDeleteContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteContact.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteContact service with contact id", async () => {
    const { result } = renderHook(() => useDeleteContact(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("c1");
    });

    expect(mockDeleteContact).toHaveBeenCalledWith("c1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteContact(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("c1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useCreateContactTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateContactTag.mockResolvedValue({
      tag: { id: "t1", name: "VIP" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call createContactTag with tag name string", async () => {
    const { result } = renderHook(() => useCreateContactTag(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("VIP");
    });

    expect(mockCreateContactTag).toHaveBeenCalledWith("VIP");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateContactTag(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("VIP");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useUpdateContactTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockUpdateContactTag.mockResolvedValue({
      tag: { id: "t1", name: "Premium" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call updateContactTag with id and name", async () => {
    const { result } = renderHook(() => useUpdateContactTag(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "t1", name: "Premium" });
    });

    expect(mockUpdateContactTag).toHaveBeenCalledWith("t1", "Premium");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUpdateContactTag(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: "t1", name: "Premium" });
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useDeleteContactTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteContactTag.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteContactTag with tag id", async () => {
    const { result } = renderHook(() => useDeleteContactTag(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("t1");
    });

    expect(mockDeleteContactTag).toHaveBeenCalledWith("t1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteContactTag(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("t1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useAddContactNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockAddContactNote.mockResolvedValue({
      note: { id: "n1", content: "Test note", createdAt: "2024-01-01" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call addContactNote with contactId and content string", async () => {
    const { result } = renderHook(() => useAddContactNote("c1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("Test note");
    });

    expect(mockAddContactNote).toHaveBeenCalledWith("c1", "Test note");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useAddContactNote("c1"), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync("Test note");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useDeleteContactNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteContactNote.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteContactNote with contactId and noteId", async () => {
    const { result } = renderHook(() => useDeleteContactNote("c1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("n1");
    });

    expect(mockDeleteContactNote).toHaveBeenCalledWith("c1", "n1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteContactNote("c1"), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync("n1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useAddContactAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockAddContactAttachment.mockResolvedValue({
      message: "Attachment added",
      attachment: {
        id: "a1",
        fileName: "test.pdf",
        filePath: "/path/to/file",
        fileSize: 1024,
        createdAt: "2024-01-01",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useAddContactAttachment("c1"), {
      wrapper,
    });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    await expect(
      act(async () => {
        await result.current.mutateAsync(file);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useDeleteContactAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteContactAttachment.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteContactAttachment with contactId and attachmentId", async () => {
    const { result } = renderHook(() => useDeleteContactAttachment("c1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("a1");
    });

    expect(mockDeleteContactAttachment).toHaveBeenCalledWith("c1", "a1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteContactAttachment("c1"), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync("a1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useAddContactCommunication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockAddContactCommunication.mockResolvedValue({
      communication: {
        id: "comm1",
        type: "CALL",
        subject: "Follow up",
        createdAt: "2024-01-01",
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call addContactCommunication with contactId and communication data", async () => {
    const { result } = renderHook(() => useAddContactCommunication("c1"), {
      wrapper,
    });

    const commData = { type: "CALL" as const, subject: "Follow up" };

    await act(async () => {
      await result.current.mutateAsync(commData);
    });

    expect(mockAddContactCommunication).toHaveBeenCalledWith("c1", commData);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useAddContactCommunication("c1"), {
      wrapper,
    });

    const commData = { type: "EMAIL" as const };

    await expect(
      act(async () => {
        await result.current.mutateAsync(commData);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});

describe("useImportContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockImportContactsCsv.mockResolvedValue({ created: 5, total: 5 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call importContactsCsv with file object", async () => {
    const { result } = renderHook(() => useImportContacts(), { wrapper });

    const file = new File(["firstName,lastName\nJohn,Doe"], "contacts.csv", {
      type: "text/csv",
    });

    await act(async () => {
      await result.current.mutateAsync(file);
    });

    expect(mockImportContactsCsv).toHaveBeenCalledWith(file);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useImportContacts(), { wrapper });

    const file = new File(["test"], "contacts.csv", { type: "text/csv" });

    await expect(
      act(async () => {
        await result.current.mutateAsync(file);
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });
});
