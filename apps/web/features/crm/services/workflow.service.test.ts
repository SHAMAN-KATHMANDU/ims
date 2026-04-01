import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWorkflows,
  getWorkflowTemplates,
  getWorkflowRuns,
  getWorkflowById,
  createWorkflow,
  installWorkflowTemplate,
  updateWorkflow,
  deleteWorkflow,
} from "./workflow.service";

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

describe("workflow.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets workflows with params", async () => {
    mockGet.mockResolvedValue({ data: { workflows: [] } });
    await getWorkflows({ page: 1, limit: 10, search: "auto" });
    expect(mockGet).toHaveBeenCalledWith("/workflows", {
      params: { page: 1, limit: 10, search: "auto" },
    });
  });

  it("gets workflow by id", async () => {
    mockGet.mockResolvedValue({ data: { workflow: { id: "wf1" } } });
    await getWorkflowById("wf1");
    expect(mockGet).toHaveBeenCalledWith("/workflows/wf1");
  });

  it("gets workflow templates and runs", async () => {
    mockGet.mockResolvedValueOnce({ data: { templates: [] } });
    mockGet.mockResolvedValueOnce({ data: { runs: [] } });

    await getWorkflowTemplates();
    await getWorkflowRuns("wf1", { limit: 5 });

    expect(mockGet).toHaveBeenNthCalledWith(1, "/workflows/templates");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/workflows/wf1/runs", {
      params: { limit: 5 },
    });
  });

  it("creates and updates workflow", async () => {
    mockPost.mockResolvedValue({ data: { workflow: { id: "wf1" } } });
    mockPut.mockResolvedValue({ data: { workflow: { id: "wf1" } } });

    await createWorkflow({ pipelineId: "p1", name: "Auto" });
    await updateWorkflow("wf1", { name: "Updated Auto" });

    expect(mockPost).toHaveBeenCalledWith("/workflows", {
      pipelineId: "p1",
      name: "Auto",
    });
    expect(mockPut).toHaveBeenCalledWith("/workflows/wf1", {
      name: "Updated Auto",
    });
  });

  it("installs workflow template", async () => {
    mockPost.mockResolvedValue({
      data: {
        workflow: { id: "wf-template" },
        outcome: "installed",
        message: "Workflow template installed successfully",
      },
    });
    await installWorkflowTemplate("new-sales-sales-won-follow-up", {
      overwriteExisting: true,
    });
    expect(mockPost).toHaveBeenCalledWith(
      "/workflows/templates/new-sales-sales-won-follow-up/install",
      { overwriteExisting: true },
    );
  });

  it("deletes workflow", async () => {
    mockDelete.mockResolvedValue(undefined);
    await deleteWorkflow("wf1");
    expect(mockDelete).toHaveBeenCalledWith("/workflows/wf1");
  });

  it("calls handleApiError on failure", async () => {
    const error = new Error("Network down");
    mockGet.mockRejectedValue(error);
    mockHandleApiError.mockImplementation(() => {
      throw error;
    });

    await expect(getWorkflows()).rejects.toThrow("Network down");
    expect(mockHandleApiError).toHaveBeenCalledWith(error, "fetch workflows");
  });
});
