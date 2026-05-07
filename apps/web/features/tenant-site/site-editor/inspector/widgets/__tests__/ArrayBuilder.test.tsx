import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArrayBuilder } from "../ArrayBuilder";

interface TestItem {
  id: string;
  label: string;
  value?: string;
}

const mockItems: TestItem[] = [
  { id: "1", label: "First", value: "val1" },
  { id: "2", label: "Second", value: "val2" },
  { id: "3", label: "Third", value: "val3" },
];

describe("ArrayBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders items with collapsed/expanded state", () => {
    const handleChange = vi.fn();
    render(
      <ArrayBuilder<TestItem>
        value={mockItems}
        onChange={handleChange}
        renderRow={(item) => <div>{item.label}</div>}
        renderCollapsedTitle={(item) => `Item: ${item.label}`}
        addLabel="Add item"
        blockKind="test"
      />,
    );

    mockItems.forEach((item) => {
      expect(screen.getByText(`Item: ${item.label}`)).toBeInTheDocument();
    });
  });

  it("expands and collapses rows", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <ArrayBuilder<TestItem>
        value={mockItems}
        onChange={handleChange}
        renderRow={(item) => (
          <div data-testid={`row-${item.id}`}>{item.label}</div>
        )}
        renderCollapsedTitle={(item) => item.label}
        addLabel="Add item"
        blockKind="test"
      />,
    );

    // Initially expanded, content should be visible
    expect(screen.getByTestId("row-1")).toBeInTheDocument();

    // Get all Cards and their buttons
    const cards = container.querySelectorAll("[class*='Card']");
    if (cards.length > 0 && cards[0]) {
      const firstCard = cards[0] as HTMLElement;
      const buttons = Array.from(
        firstCard.querySelectorAll("button"),
      ) as HTMLButtonElement[];
      // Second button should be the expand/collapse button
      if (buttons.length > 1 && buttons[1]) {
        fireEvent.click(buttons[1]);
        // After collapse, content should be hidden
        expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();
      }
    }
  });

  it("adds a new item", () => {
    const handleChange = vi.fn();
    render(
      <ArrayBuilder<TestItem>
        value={mockItems}
        onChange={handleChange}
        renderRow={(item) => <div>{item.label}</div>}
        addLabel="Add item"
        blockKind="test"
      />,
    );

    const addButton = screen.getByRole("button", { name: /add item/i });
    fireEvent.click(addButton);

    expect(handleChange).toHaveBeenCalledWith([
      ...mockItems,
      expect.any(Object),
    ]);
  });

  it("deletes an item", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <ArrayBuilder<TestItem>
        value={mockItems}
        onChange={handleChange}
        renderRow={(item) => <div>{item.label}</div>}
        renderCollapsedTitle={(item) => item.label}
        blockKind="test"
      />,
    );

    const trashButtons = container.querySelectorAll("button[title='Delete']");
    if (trashButtons[0]) {
      fireEvent.click(trashButtons[0]);
    }

    expect(handleChange).toHaveBeenCalledWith(mockItems.slice(1));
  });

  it("duplicates an item", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <ArrayBuilder<TestItem>
        value={mockItems}
        onChange={handleChange}
        renderRow={(item) => <div>{item.label}</div>}
        renderCollapsedTitle={(item) => item.label}
        blockKind="test"
      />,
    );

    const copyButtons = container.querySelectorAll("button[title='Duplicate']");
    if (copyButtons[0]) {
      fireEvent.click(copyButtons[0]);
    }

    expect(handleChange).toHaveBeenCalled();
    const firstCall = handleChange.mock.calls[0];
    if (!firstCall) throw new Error("expected onChange call");
    const callArg = firstCall[0] as unknown[];
    expect(callArg.length).toBe(4);
    expect(callArg[0]).toEqual(mockItems[0]);
    expect(callArg[1]).toEqual(mockItems[0]);
  });

  it("renders with custom add label", () => {
    const handleChange = vi.fn();
    render(
      <ArrayBuilder<{ label: string }>
        value={[]}
        onChange={handleChange}
        renderRow={(item) => <div>{item.label}</div>}
        addLabel="Add custom item"
        blockKind="test"
      />,
    );

    expect(
      screen.getByRole("button", { name: /add custom item/i }),
    ).toBeInTheDocument();
  });

  it("renders empty state", () => {
    const handleChange = vi.fn();
    render(
      <ArrayBuilder<TestItem>
        value={[]}
        onChange={handleChange}
        renderRow={(item) => <div>{item.label}</div>}
        addLabel="Add item"
        blockKind="test"
      />,
    );

    expect(
      screen.getByRole("button", { name: /add item/i }),
    ).toBeInTheDocument();
  });

  it("sets data-testid with blockKind", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <ArrayBuilder
        value={mockItems}
        onChange={handleChange}
        renderRow={(item) => <div>{item.label}</div>}
        blockKind="nav-bar"
      />,
    );

    expect(
      container.querySelector('[data-testid="array-builder-nav-bar"]'),
    ).toBeInTheDocument();
  });
});
