import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveAutomationDefinition,
  createAutomationDefinition,
  getAutomationDefinitions,
  getAutomationRuns,
  replayAutomationEvent,
  updateAutomationDefinition,
} from "./automation.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockHandleApiError = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: (...args: unknown[]) => mockHandleApiError(...args),
}));

describe("automation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists automation definitions via wrapped api response", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          automations: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      },
    });

    await getAutomationDefinitions({ page: 1, limit: 10 });

    expect(mockGet).toHaveBeenCalledWith("/automation/definitions", {
      params: { page: 1, limit: 10 },
    });
  });

  it("creates, updates, archives, lists runs, and replays failed events", async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { automation: { id: "auto-1" } } },
    });
    mockPut.mockResolvedValue({
      data: { success: true, data: { automation: { id: "auto-1" } } },
    });
    mockDelete.mockResolvedValue({
      data: { success: true, data: { archived: true } },
    });
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: { runs: [] } },
    });

    await createAutomationDefinition({
      name: "Restock",
      scopeType: "GLOBAL",
      triggers: [{ eventName: "inventory.stock.low_detected" }],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Restock",
            type: "RESTOCK_REQUEST",
            priority: "HIGH",
          },
        },
      ],
    });
    await updateAutomationDefinition("auto-1", { status: "INACTIVE" });
    await archiveAutomationDefinition("auto-1");
    await getAutomationRuns("auto-1", { limit: 5 });
    await replayAutomationEvent("event-1", { reprocessFromStart: true });

    expect(mockPost).toHaveBeenCalledWith(
      "/automation/definitions",
      expect.objectContaining({ name: "Restock" }),
    );
    expect(mockPut).toHaveBeenCalledWith("/automation/definitions/auto-1", {
      status: "INACTIVE",
    });
    expect(mockDelete).toHaveBeenCalledWith("/automation/definitions/auto-1");
    expect(mockGet).toHaveBeenCalledWith(
      "/automation/definitions/auto-1/runs",
      {
        params: { limit: 5 },
      },
    );
    expect(mockPost).toHaveBeenCalledWith("/automation/events/event-1/replay", {
      reprocessFromStart: true,
    });
  });
});
