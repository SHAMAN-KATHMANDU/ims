import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getContactTags,
  createContactTag,
  updateContactTag,
  deleteContactTag,
  addContactNote,
  deleteContactNote,
  addContactAttachment,
  deleteContactAttachment,
  addContactCommunication,
  importContactsCsv,
  exportContactsCsv,
  type Contact,
} from "./contact.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockUnwrapApiData = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/apiResponse", () => ({
  unwrapApiData: (...args: unknown[]) => mockUnwrapApiData(...args),
}));

describe("contact.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getContacts", () => {
    it("fetches contacts with pagination params", async () => {
      const mockContacts: Contact[] = [
        {
          id: "c1",
          firstName: "John",
          purchaseCount: 5,
          ownedById: "u1",
          createdById: "u1",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-02",
        },
      ];
      mockGet.mockResolvedValue({
        data: {
          data: mockContacts,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      const result = await getContacts({ page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith("/contacts", {
        params: { page: 1, limit: 10 },
      });
      expect(result.data).toEqual(mockContacts);
      expect(result.pagination.currentPage).toBe(1);
    });

    it("fetches contacts with search and filter params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: 20,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      await getContacts({
        search: "john",
        sortBy: "firstName",
        sortOrder: "asc",
        companyId: "comp1",
        tagId: "tag1",
        ownerId: "owner1",
        source: "web",
        journeyType: "customer",
      });

      expect(mockGet).toHaveBeenCalledWith("/contacts", {
        params: {
          search: "john",
          sortBy: "firstName",
          sortOrder: "asc",
          companyId: "comp1",
          tagId: "tag1",
          ownerId: "owner1",
          source: "web",
          journeyType: "customer",
        },
      });
    });

    it("fetches contacts with no params (defaults)", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: 20,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      await getContacts();

      expect(mockGet).toHaveBeenCalledWith("/contacts", { params: {} });
    });

    it("returns empty contacts list", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: 20,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      const result = await getContacts({ limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
    });
  });

  describe("getContactById", () => {
    it("fetches contact detail by id with nested relations", async () => {
      const mockContact = {
        contact: {
          id: "c1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          purchaseCount: 5,
          ownedById: "u1",
          createdById: "u1",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-02",
          company: { id: "comp1", name: "Acme Corp" },
          member: {
            id: "m1",
            name: "John Member",
            phone: "555-1234",
            memberStatus: "active",
          },
          notes: [{ id: "n1", content: "Note 1", createdAt: "2024-01-01" }],
          deals: [
            {
              id: "d1",
              stage: "proposal",
              status: "active",
              pipelineId: "p1",
              pipeline: { id: "p1", name: "Sales" },
            },
          ],
        },
      };

      mockGet.mockResolvedValue({ data: mockContact });

      const result = await getContactById("c1");

      expect(mockGet).toHaveBeenCalledWith("/contacts/c1");
      expect(result.contact.id).toBe("c1");
      expect(result.contact.company?.name).toBe("Acme Corp");
      expect(result.contact.notes).toBeDefined();
      expect(result.contact.deals).toBeDefined();
    });

    it("fetches contact without optional relations", async () => {
      const mockContact = {
        contact: {
          id: "c2",
          firstName: "Jane",
          purchaseCount: 0,
          ownedById: "u2",
          createdById: "u2",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-02",
        },
      };

      mockGet.mockResolvedValue({ data: mockContact });

      const result = await getContactById("c2");

      expect(result.contact.id).toBe("c2");
      expect(result.contact.company).toBeUndefined();
      expect(result.contact.notes).toBeUndefined();
    });
  });

  describe("createContact", () => {
    it("creates contact with required fields only", async () => {
      mockPost.mockResolvedValue({
        data: {
          contact: {
            id: "c-new",
            firstName: "Alice",
            purchaseCount: 0,
            ownedById: "u1",
            createdById: "u1",
            createdAt: "2024-01-03",
            updatedAt: "2024-01-03",
          },
        },
      });

      const result = await createContact({ firstName: "Alice" });

      expect(mockPost).toHaveBeenCalledWith(
        "/contacts",
        { firstName: "Alice" },
        { skipGlobalErrorToast: true },
      );
      expect(result.contact.firstName).toBe("Alice");
    });

    it("creates contact with all optional fields", async () => {
      mockPost.mockResolvedValue({
        data: {
          contact: {
            id: "c-new2",
            firstName: "Bob",
            lastName: "Smith",
            email: "bob@example.com",
            phone: "555-9999",
            gender: "M",
            birthDate: "1990-01-01",
            companyId: "comp1",
            memberId: "m1",
            source: "referral",
            journeyType: "prospect",
            purchaseCount: 0,
            ownedById: "u1",
            createdById: "u1",
            createdAt: "2024-01-03",
            updatedAt: "2024-01-03",
          },
        },
      });

      await createContact({
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@example.com",
        phone: "555-9999",
        gender: "M",
        birthDate: "1990-01-01",
        companyId: "comp1",
        memberId: "m1",
        source: "referral",
        journeyType: "prospect",
        tagIds: ["tag1", "tag2"],
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/contacts",
        {
          firstName: "Bob",
          lastName: "Smith",
          email: "bob@example.com",
          phone: "555-9999",
          gender: "M",
          birthDate: "1990-01-01",
          companyId: "comp1",
          memberId: "m1",
          source: "referral",
          journeyType: "prospect",
          tagIds: ["tag1", "tag2"],
        },
        { skipGlobalErrorToast: true },
      );
    });

    it("handles creation error via axios rejection", async () => {
      const error = new Error("Validation failed");
      mockPost.mockRejectedValue(error);

      await expect(createContact({ firstName: "Invalid" })).rejects.toThrow(
        "Validation failed",
      );
    });
  });

  describe("updateContact", () => {
    it("updates contact with PUT and skipGlobalErrorToast flag", async () => {
      mockPut.mockResolvedValue({
        data: {
          contact: {
            id: "c1",
            firstName: "Jane Updated",
            purchaseCount: 5,
            ownedById: "u1",
            createdById: "u1",
            createdAt: "2024-01-01",
            updatedAt: "2024-01-04",
          },
        },
      });

      await updateContact("c1", { firstName: "Jane Updated" });

      expect(mockPut).toHaveBeenCalledWith(
        "/contacts/c1",
        { firstName: "Jane Updated" },
        { skipGlobalErrorToast: true },
      );
    });

    it("updates contact with partial fields", async () => {
      mockPut.mockResolvedValue({
        data: {
          contact: {
            id: "c1",
            firstName: "John",
            email: "newemail@example.com",
            purchaseCount: 5,
            ownedById: "u1",
            createdById: "u1",
            createdAt: "2024-01-01",
            updatedAt: "2024-01-04",
          },
        },
      });

      await updateContact("c1", { email: "newemail@example.com" });

      expect(mockPut).toHaveBeenCalledWith(
        "/contacts/c1",
        { email: "newemail@example.com" },
        { skipGlobalErrorToast: true },
      );
    });
  });

  describe("deleteContact", () => {
    it("deletes contact by id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteContact("c1");

      expect(mockDelete).toHaveBeenCalledWith("/contacts/c1");
    });

    it("handles delete error", async () => {
      const error = new Error("Contact not found");
      mockDelete.mockRejectedValue(error);

      await expect(deleteContact("nonexistent")).rejects.toThrow(
        "Contact not found",
      );
    });
  });

  describe("getContactTags", () => {
    it("fetches contact tags with pagination", async () => {
      mockGet.mockResolvedValue({
        data: {
          tags: [
            { id: "tag1", name: "VIP", createdAt: "2024-01-01" },
            { id: "tag2", name: "Prospect", createdAt: "2024-01-01" },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      const result = await getContactTags({ page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith("/contacts/tags", {
        params: { page: 1, limit: 10 },
      });
      expect(result.tags).toHaveLength(2);
      expect(result.tags[0]!.name).toBe("VIP");
      expect(result.pagination?.totalItems).toBe(2);
    });

    it("fetches contact tags with search", async () => {
      mockGet.mockResolvedValue({
        data: {
          tags: [{ id: "tag1", name: "VIP" }],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });

      await getContactTags({ search: "VIP" });

      expect(mockGet).toHaveBeenCalledWith("/contacts/tags", {
        params: { search: "VIP" },
      });
    });

    it("fetches contact tags without params (optional)", async () => {
      mockGet.mockResolvedValue({
        data: {
          tags: [],
        },
      });

      await getContactTags();

      expect(mockGet).toHaveBeenCalledWith("/contacts/tags", {
        params: undefined,
      });
    });
  });

  describe("createContactTag", () => {
    it("creates a contact tag with name", async () => {
      mockPost.mockResolvedValue({
        data: {
          tag: { id: "tag-new", name: "Hotlead", createdAt: "2024-01-05" },
        },
      });

      const result = await createContactTag("Hotlead");

      expect(mockPost).toHaveBeenCalledWith("/contacts/tags", {
        name: "Hotlead",
      });
      expect(result.tag.name).toBe("Hotlead");
    });
  });

  describe("updateContactTag", () => {
    it("updates contact tag with PATCH", async () => {
      mockPatch.mockResolvedValue({
        data: {
          tag: { id: "tag1", name: "Hot Lead Updated" },
        },
      });

      const result = await updateContactTag("tag1", "Hot Lead Updated");

      expect(mockPatch).toHaveBeenCalledWith("/contacts/tags/tag1", {
        name: "Hot Lead Updated",
      });
      expect(result.tag.name).toBe("Hot Lead Updated");
    });
  });

  describe("deleteContactTag", () => {
    it("deletes contact tag", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteContactTag("tag1");

      expect(mockDelete).toHaveBeenCalledWith("/contacts/tags/tag1");
    });
  });

  describe("addContactNote", () => {
    it("adds a note to contact with nested endpoint", async () => {
      mockPost.mockResolvedValue({
        data: {
          note: {
            id: "note-1",
            content: "Follow up needed",
            createdAt: "2024-01-05",
            creator: { id: "u1", username: "john" },
          },
        },
      });

      const result = await addContactNote("c1", "Follow up needed");

      expect(mockPost).toHaveBeenCalledWith("/contacts/c1/notes", {
        content: "Follow up needed",
      });
      expect(result.note.id).toBe("note-1");
    });

    it("adds a note with multiline content", async () => {
      const multilineContent = "Line 1\nLine 2\nLine 3";
      mockPost.mockResolvedValue({
        data: {
          note: {
            id: "note-2",
            content: multilineContent,
            createdAt: "2024-01-05",
          },
        },
      });

      await addContactNote("c1", multilineContent);

      expect(mockPost).toHaveBeenCalledWith("/contacts/c1/notes", {
        content: multilineContent,
      });
    });
  });

  describe("deleteContactNote", () => {
    it("deletes a contact note via nested endpoint", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteContactNote("c1", "note-1");

      expect(mockDelete).toHaveBeenCalledWith("/contacts/c1/notes/note-1");
    });
  });

  describe("addContactAttachment", () => {
    it("adds attachment and unwraps API response", async () => {
      mockPost.mockResolvedValue({
        data: {
          message: "Attachment uploaded",
          attachment: {
            id: "att-1",
            fileName: "resume.pdf",
            filePath: "/path/to/resume.pdf",
            storageKey: "s3://bucket/resume.pdf",
            publicUrl: "https://example.com/resume.pdf",
            fileSize: 1024,
            mimeType: "application/pdf",
            createdAt: "2024-01-05",
          },
        },
      });

      mockUnwrapApiData.mockReturnValue({
        message: "Attachment uploaded",
        attachment: {
          id: "att-1",
          fileName: "resume.pdf",
          filePath: "/path/to/resume.pdf",
          storageKey: "s3://bucket/resume.pdf",
          publicUrl: "https://example.com/resume.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          createdAt: "2024-01-05",
        },
      });

      const result = await addContactAttachment("c1", {
        storageKey: "s3://bucket/resume.pdf",
        fileName: "resume.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        publicUrl: "https://example.com/resume.pdf",
      });

      expect(mockPost).toHaveBeenCalledWith("/contacts/c1/attachments", {
        storageKey: "s3://bucket/resume.pdf",
        fileName: "resume.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        publicUrl: "https://example.com/resume.pdf",
      });

      expect(mockUnwrapApiData).toHaveBeenCalled();
      expect(result.attachment.fileName).toBe("resume.pdf");
    });

    it("adds attachment with minimal fields", async () => {
      mockPost.mockResolvedValue({
        data: {
          message: "Attachment uploaded",
          attachment: {
            id: "att-2",
            fileName: "doc.txt",
            filePath: "/path/to/doc.txt",
            storageKey: "s3://bucket/doc.txt",
            createdAt: "2024-01-05",
          },
        },
      });

      mockUnwrapApiData.mockReturnValue({
        message: "Attachment uploaded",
        attachment: {
          id: "att-2",
          fileName: "doc.txt",
          filePath: "/path/to/doc.txt",
          storageKey: "s3://bucket/doc.txt",
          createdAt: "2024-01-05",
        },
      });

      await addContactAttachment("c1", {
        storageKey: "s3://bucket/doc.txt",
        fileName: "doc.txt",
        mimeType: "text/plain",
      });

      expect(mockPost).toHaveBeenCalledWith("/contacts/c1/attachments", {
        storageKey: "s3://bucket/doc.txt",
        fileName: "doc.txt",
        mimeType: "text/plain",
      });
    });
  });

  describe("deleteContactAttachment", () => {
    it("deletes an attachment via nested endpoint", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteContactAttachment("c1", "att-1");

      expect(mockDelete).toHaveBeenCalledWith("/contacts/c1/attachments/att-1");
    });
  });

  describe("addContactCommunication", () => {
    it("adds CALL communication with notes", async () => {
      mockPost.mockResolvedValue({
        data: {
          communication: {
            id: "comm-1",
            type: "CALL",
            subject: "Sales call",
            notes: "Discussed pricing",
            createdAt: "2024-01-05",
            creator: { id: "u1", username: "john" },
          },
        },
      });

      await addContactCommunication("c1", {
        type: "CALL",
        subject: "Sales call",
        notes: "Discussed pricing",
      });

      expect(mockPost).toHaveBeenCalledWith("/contacts/c1/communications", {
        type: "CALL",
        subject: "Sales call",
        notes: "Discussed pricing",
      });
    });

    it("adds EMAIL communication without optional fields", async () => {
      mockPost.mockResolvedValue({
        data: {
          communication: {
            id: "comm-2",
            type: "EMAIL",
            createdAt: "2024-01-05",
          },
        },
      });

      await addContactCommunication("c1", { type: "EMAIL" });

      expect(mockPost).toHaveBeenCalledWith("/contacts/c1/communications", {
        type: "EMAIL",
      });
    });

    it("adds MEETING communication", async () => {
      mockPost.mockResolvedValue({
        data: {
          communication: {
            id: "comm-3",
            type: "MEETING",
            subject: "Board meeting",
            notes: "Discussed Q1 targets",
            createdAt: "2024-01-05",
          },
        },
      });

      await addContactCommunication("c1", {
        type: "MEETING",
        subject: "Board meeting",
        notes: "Discussed Q1 targets",
      });

      expect(mockPost).toHaveBeenCalledWith("/contacts/c1/communications", {
        type: "MEETING",
        subject: "Board meeting",
        notes: "Discussed Q1 targets",
      });
    });
  });

  describe("importContactsCsv", () => {
    it("imports contacts from CSV file with FormData", async () => {
      mockPost.mockResolvedValue({
        data: {
          created: 50,
          total: 50,
        },
      });

      const file = new File(["col1,col2\nval1,val2"], "contacts.csv", {
        type: "text/csv",
      });

      const result = await importContactsCsv(file);

      expect(mockPost).toHaveBeenCalled();
      const [url, body] = mockPost.mock.calls[0]!;
      expect(url).toBe("/contacts/import");
      expect(body).toBeInstanceOf(FormData);

      expect(result.created).toBe(50);
      expect(result.total).toBe(50);
    });

    it("handles CSV import with validation errors", async () => {
      mockPost.mockResolvedValue({
        data: {
          created: 40,
          total: 50,
        },
      });

      const file = new File(["data"], "contacts.csv", { type: "text/csv" });

      const result = await importContactsCsv(file);

      expect(result.created).toBe(40);
      expect(result.total).toBe(50);
    });
  });

  describe("exportContactsCsv", () => {
    it("exports all contacts as blob with no IDs specified", async () => {
      const mockBlob = new Blob(["id,name\n1,John\n2,Jane"], {
        type: "text/csv",
      });
      mockGet.mockResolvedValue({ data: mockBlob });

      const result = await exportContactsCsv();

      expect(mockGet).toHaveBeenCalledWith("/contacts/export", {
        params: {},
        responseType: "blob",
      });
      expect(result).toBeInstanceOf(Blob);
    });

    it("exports specific contacts with ids array", async () => {
      const mockBlob = new Blob(["id,name\n1,John"], { type: "text/csv" });
      mockGet.mockResolvedValue({ data: mockBlob });

      await exportContactsCsv(["c1", "c2", "c3"]);

      expect(mockGet).toHaveBeenCalledWith("/contacts/export", {
        params: { ids: "c1,c2,c3" },
        responseType: "blob",
      });
    });

    it("exports with empty ids array treated as no filter", async () => {
      const mockBlob = new Blob(["id,name\n1,John\n2,Jane"], {
        type: "text/csv",
      });
      mockGet.mockResolvedValue({ data: mockBlob });

      await exportContactsCsv([]);

      expect(mockGet).toHaveBeenCalledWith("/contacts/export", {
        params: {},
        responseType: "blob",
      });
    });

    it("handles export of single contact", async () => {
      const mockBlob = new Blob(["id,name\n1,John"], { type: "text/csv" });
      mockGet.mockResolvedValue({ data: mockBlob });

      const result = await exportContactsCsv(["c1"]);

      expect(mockGet).toHaveBeenCalledWith("/contacts/export", {
        params: { ids: "c1" },
        responseType: "blob",
      });
      expect(result).toBeInstanceOf(Blob);
    });
  });
});
