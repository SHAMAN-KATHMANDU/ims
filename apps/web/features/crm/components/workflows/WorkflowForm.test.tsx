import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkflowForm } from "./WorkflowForm";

describe("WorkflowForm", () => {
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits edit form values", async () => {
    const onSubmit = vi.fn();

    render(
      <WorkflowForm
        mode="edit"
        pipelines={[{ id: "p1", name: "Main Pipeline" }]}
        stages={[{ id: "s1", name: "New" }]}
        defaultValues={{ name: "Existing flow", isActive: true, rules: [] }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated flow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Updated flow", isActive: true }),
      );
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <WorkflowForm
        mode="edit"
        pipelines={[{ id: "p1", name: "Main Pipeline" }]}
        stages={[]}
        defaultValues={{ name: "Existing flow", isActive: true, rules: [] }}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
