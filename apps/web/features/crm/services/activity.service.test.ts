import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getActivitiesByContact,
  getActivitiesByDeal,
  createActivity,
  deleteActivity,
  type Activity,
  type ActivityType,
} from "./activity.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("activity.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActivitiesByContact", () => {
    it("fetches activities for a contact with pagination params", async () => {
      const mockActivity: Activity = {
        id: "a1",
        type: "CALL",
        subject: "Test Call",
        activityAt: "2025-01-01T10:00:00Z",
        createdById: "u1",
        createdAt: "2025-01-01T09:00:00Z",
        contactId: "c1",
      };

      mockGet.mockResolvedValue({
        data: {
          activities: [mockActivity],
          pagination: { page: 1, limit: 10, total: 1 },
        },
      });

      const result = await getActivitiesByContact("c1", {
        page: 1,
        limit: 10,
      });

      expect(mockGet).toHaveBeenCalledWith("/activities/contact/c1", {
        params: { page: 1, limit: 10 },
      });
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].id).toBe("a1");
      expect(result.pagination?.total).toBe(1);
    });

    it("handles contact ID with special characters in URL", async () => {
      mockGet.mockResolvedValue({
        data: { activities: [], pagination: { page: 1, limit: 10, total: 0 } },
      });

      await getActivitiesByContact("contact-with-dash_and_underscore");

      expect(mockGet).toHaveBeenCalledWith(
        "/activities/contact/contact-with-dash_and_underscore",
        { params: undefined },
      );
    });

    it("filters activities by type when type param is provided", async () => {
      mockGet.mockResolvedValue({
        data: {
          activities: [
            {
              id: "a1",
              type: "EMAIL" as ActivityType,
              activityAt: "2025-01-01T10:00:00Z",
              createdById: "u1",
              createdAt: "2025-01-01T09:00:00Z",
            },
          ],
          pagination: { page: 1, limit: 10, total: 1 },
        },
      });

      await getActivitiesByContact("c1", { type: "EMAIL", page: 1 });

      expect(mockGet).toHaveBeenCalledWith("/activities/contact/c1", {
        params: { type: "EMAIL", page: 1 },
      });
    });

    it("returns empty activities array when no results match", async () => {
      mockGet.mockResolvedValue({
        data: { activities: [], pagination: { page: 1, limit: 10, total: 0 } },
      });

      const result = await getActivitiesByContact("c-nonexistent");

      expect(result.activities).toEqual([]);
      expect(result.pagination?.total).toBe(0);
    });

    it("omits optional params when not provided", async () => {
      mockGet.mockResolvedValue({
        data: { activities: [] },
      });

      await getActivitiesByContact("c1");

      expect(mockGet).toHaveBeenCalledWith("/activities/contact/c1", {
        params: undefined,
      });
    });

    it("rejects with error when API call fails", async () => {
      const error = new Error("Network error");
      mockGet.mockRejectedValue(error);

      await expect(getActivitiesByContact("c1", { page: 1 })).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("getActivitiesByDeal", () => {
    it("fetches activities for a deal with pagination params", async () => {
      const mockActivity: Activity = {
        id: "a2",
        type: "MEETING",
        subject: "Deal Discussion",
        activityAt: "2025-01-02T14:00:00Z",
        createdById: "u2",
        createdAt: "2025-01-02T13:00:00Z",
        dealId: "d1",
      };

      mockGet.mockResolvedValue({
        data: {
          activities: [mockActivity],
          pagination: { page: 1, limit: 20, total: 1 },
        },
      });

      const result = await getActivitiesByDeal("d1", { page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith("/activities/deal/d1", {
        params: { page: 1, limit: 20 },
      });
      expect(result.activities[0].type).toBe("MEETING");
      expect(result.activities[0].dealId).toBe("d1");
    });

    it("includes nested deal data in activity response", async () => {
      mockGet.mockResolvedValue({
        data: {
          activities: [
            {
              id: "a2",
              type: "MEETING" as ActivityType,
              dealId: "d1",
              activityAt: "2025-01-02T14:00:00Z",
              createdById: "u2",
              createdAt: "2025-01-02T13:00:00Z",
              deal: { id: "d1", name: "Big Deal" },
            },
          ],
        },
      });

      const result = await getActivitiesByDeal("d1");

      expect(result.activities[0].deal?.name).toBe("Big Deal");
    });

    it("handles multiple activities for the same deal", async () => {
      const activities = [
        {
          id: "a1",
          type: "CALL" as ActivityType,
          dealId: "d1",
          activityAt: "2025-01-01T10:00:00Z",
          createdById: "u1",
          createdAt: "2025-01-01T09:00:00Z",
        },
        {
          id: "a2",
          type: "EMAIL" as ActivityType,
          dealId: "d1",
          activityAt: "2025-01-02T11:00:00Z",
          createdById: "u1",
          createdAt: "2025-01-02T10:00:00Z",
        },
        {
          id: "a3",
          type: "MEETING" as ActivityType,
          dealId: "d1",
          activityAt: "2025-01-03T15:00:00Z",
          createdById: "u2",
          createdAt: "2025-01-03T14:00:00Z",
        },
      ];

      mockGet.mockResolvedValue({
        data: {
          activities,
          pagination: { page: 1, limit: 10, total: 3 },
        },
      });

      const result = await getActivitiesByDeal("d1");

      expect(result.activities).toHaveLength(3);
      expect(result.activities.map((a) => a.type)).toEqual([
        "CALL",
        "EMAIL",
        "MEETING",
      ]);
    });

    it("rejects with error when deal not found", async () => {
      const error = new Error("Deal not found");
      mockGet.mockRejectedValue(error);

      await expect(getActivitiesByDeal("d-invalid")).rejects.toThrow(
        "Deal not found",
      );
    });
  });

  describe("createActivity", () => {
    it("creates a new activity with all optional fields", async () => {
      const activityData = {
        type: "CALL" as ActivityType,
        subject: "Follow-up Call",
        notes: "Discussed pricing",
        activityAt: "2025-01-05T16:00:00Z",
        contactId: "c1",
        memberId: "m1",
        dealId: "d1",
      };

      const createdActivity: Activity = {
        id: "a-new",
        ...activityData,
        createdById: "u1",
        createdAt: "2025-01-05T15:00:00Z",
      };

      mockPost.mockResolvedValue({
        data: { activity: createdActivity },
      });

      const result = await createActivity(activityData);

      expect(mockPost).toHaveBeenCalledWith("/activities", activityData);
      expect(result.activity.id).toBe("a-new");
      expect(result.activity.subject).toBe("Follow-up Call");
      expect(result.activity.notes).toBe("Discussed pricing");
    });

    it("creates activity with minimal required fields (type only)", async () => {
      const activityData = {
        type: "EMAIL" as ActivityType,
      };

      const createdActivity: Activity = {
        id: "a-minimal",
        type: "EMAIL",
        createdById: "u1",
        createdAt: "2025-01-05T15:00:00Z",
        activityAt: "2025-01-05T15:00:00Z",
      };

      mockPost.mockResolvedValue({
        data: { activity: createdActivity },
      });

      const result = await createActivity(activityData);

      expect(mockPost).toHaveBeenCalledWith("/activities", activityData);
      expect(result.activity.type).toBe("EMAIL");
      expect(result.activity.subject).toBeUndefined();
      expect(result.activity.notes).toBeUndefined();
    });

    it("creates activity with only contact and deal associations", async () => {
      const activityData = {
        type: "MEETING" as ActivityType,
        contactId: "c1",
        dealId: "d1",
      };

      mockPost.mockResolvedValue({
        data: {
          activity: {
            id: "a-deal-contact",
            type: "MEETING",
            contactId: "c1",
            dealId: "d1",
            createdById: "u1",
            createdAt: "2025-01-05T15:00:00Z",
            activityAt: "2025-01-05T15:00:00Z",
          },
        },
      });

      const result = await createActivity(activityData);

      expect(mockPost).toHaveBeenCalledWith("/activities", activityData);
      expect(result.activity.contactId).toBe("c1");
      expect(result.activity.dealId).toBe("d1");
      expect(result.activity.memberId).toBeUndefined();
    });

    it("includes creator and nested relations in response", async () => {
      mockPost.mockResolvedValue({
        data: {
          activity: {
            id: "a-full",
            type: "CALL" as ActivityType,
            subject: "Sales Call",
            activityAt: "2025-01-05T16:00:00Z",
            createdById: "u1",
            createdAt: "2025-01-05T15:00:00Z",
            contactId: "c1",
            contact: { id: "c1", firstName: "John", lastName: "Doe" },
            creator: { id: "u1", username: "john_user" },
          },
        },
      });

      const result = await createActivity({
        type: "CALL",
        contactId: "c1",
      });

      expect(result.activity.contact?.firstName).toBe("John");
      expect(result.activity.creator?.username).toBe("john_user");
    });

    it("rejects when required type field is missing", async () => {
      const error = new Error("Validation error: type is required");
      mockPost.mockRejectedValue(error);

      await expect(
        createActivity({
          type: undefined as unknown as ActivityType,
        }),
      ).rejects.toThrow("Validation error");
    });

    it("rejects when API returns validation error", async () => {
      const error = new Error("Invalid activity type");
      mockPost.mockRejectedValue(error);

      await expect(
        createActivity({
          type: "INVALID" as unknown as ActivityType,
        }),
      ).rejects.toThrow("Invalid activity type");
    });
  });

  describe("deleteActivity", () => {
    it("deletes activity by id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteActivity("a1");

      expect(mockDelete).toHaveBeenCalledWith("/activities/a1");
    });

    it("handles deletion of activity with special characters in id", async () => {
      mockDelete.mockResolvedValue(undefined);

      await deleteActivity("activity-uuid-with-dashes_123");

      expect(mockDelete).toHaveBeenCalledWith(
        "/activities/activity-uuid-with-dashes_123",
      );
    });

    it("rejects when activity not found", async () => {
      const error = new Error("Activity not found");
      mockDelete.mockRejectedValue(error);

      await expect(deleteActivity("a-nonexistent")).rejects.toThrow(
        "Activity not found",
      );
    });

    it("rejects with error when deletion fails", async () => {
      const error = new Error("Server error");
      mockDelete.mockRejectedValue(error);

      await expect(deleteActivity("a1")).rejects.toThrow("Server error");
    });
  });

  describe("response unwrapping", () => {
    it("unwraps nested activity from POST response", async () => {
      const nestedActivity: Activity = {
        id: "a1",
        type: "CALL",
        activityAt: "2025-01-01T10:00:00Z",
        createdById: "u1",
        createdAt: "2025-01-01T09:00:00Z",
      };

      mockPost.mockResolvedValue({
        data: {
          activity: nestedActivity,
          metadata: { success: true },
        },
      });

      const result = await createActivity({ type: "CALL" });

      expect(result).toHaveProperty("activity");
      expect(result.activity).toEqual(nestedActivity);
    });

    it("unwraps activities array from GET response", async () => {
      mockGet.mockResolvedValue({
        data: {
          activities: [
            {
              id: "a1",
              type: "CALL" as ActivityType,
              activityAt: "2025-01-01T10:00:00Z",
              createdById: "u1",
              createdAt: "2025-01-01T09:00:00Z",
            },
            {
              id: "a2",
              type: "EMAIL" as ActivityType,
              activityAt: "2025-01-02T11:00:00Z",
              createdById: "u2",
              createdAt: "2025-01-02T10:00:00Z",
            },
          ],
          pagination: { page: 1, limit: 10, total: 2 },
        },
      });

      const result = await getActivitiesByContact("c1");

      expect(result).toHaveProperty("activities");
      expect(result.activities).toHaveLength(2);
      expect(result.pagination?.total).toBe(2);
    });
  });
});
