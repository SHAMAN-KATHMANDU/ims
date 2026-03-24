import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseWorkflows = vi.fn();
const mockUsePipelines = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("../../hooks/use-workflows", () => ({
  useWorkflows: (...args: unknown[]) => mockUseWorkflows(...args),
  useCreateWorkflow: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateWorkflow: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteWorkflow: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

vi.mock("../../hooks/use-pipelines", () => ({
  usePipelines: (...args: unknown[]) => mockUsePipelines(...args),
}));

import WorkflowEditorPage from "./WorkflowEditorPage";

describe("WorkflowEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePipelines.mockReturnValue({
      data: { pipelines: [{ id: "p1", name: "Main", stages: [] }] },
    });
  });

  it("renders workflow rows", () => {
    mockUseWorkflows.mockReturnValue({
      data: {
        workflows: [
          {
            id: "wf1",
            tenantId: "t1",
            pipelineId: "p1",
            name: "Auto follow-up",
            isActive: true,
            pipeline: { id: "p1", name: "Main" },
            rules: [],
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    expect(screen.getByText("Auto follow-up")).toBeInTheDocument();
    expect(screen.getByText("Main")).toBeInTheDocument();
  });

  it("opens create workflow dialog", () => {
    mockUseWorkflows.mockReturnValue({
      data: { workflows: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<WorkflowEditorPage />);
    fireEvent.click(screen.getByRole("button", { name: /new workflow/i }));
    expect(
      screen.getByRole("heading", { name: "New Workflow" }),
    ).toBeInTheDocument();
  });
});
