import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Toggle, Slider } from "./form-bits";

describe("Toggle", () => {
  it("renders toggle with label", () => {
    render(<Toggle label="Enable feature" />);
    expect(screen.getByText("Enable feature")).toBeInTheDocument();
  });

  it("toggles state on click", async () => {
    const handleChange = vi.fn();
    render(<Toggle label="Toggle" onCheckedChange={handleChange} />);
    const button = screen.getByRole("button");

    // First click: toggle from false to true
    button.click();
    await waitFor(() => {
      expect(handleChange).toHaveBeenLastCalledWith(true);
    });

    // Second click: toggle from true to false
    button.click();
    await waitFor(() => {
      expect(handleChange).toHaveBeenLastCalledWith(false);
    });
  });

  it("initializes with defaultChecked", () => {
    render(<Toggle label="Checked by default" defaultChecked />);
    expect(screen.getByText("Checked by default")).toBeInTheDocument();
  });
});

describe("Slider", () => {
  it("renders slider input", () => {
    render(<Slider />);
    const input = screen.getByRole("slider");
    expect(input).toBeInTheDocument();
  });

  it("displays initial value", () => {
    const { container } = render(<Slider value={30} />);
    const text = container.textContent;
    expect(text).toContain("30px");
  });

  it("renders slider with min/max", () => {
    render(<Slider min={0} max={100} />);
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.min).toBe("0");
    expect(input.max).toBe("100");
  });
});
