// @vitest-environment jsdom
/**
 * CheckoutForm: double-submit protection (rapid submits used to create
 * duplicate orders), client-side validation, and the success flow.
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CartProvider } from "./CartProvider";
import { CheckoutForm } from "./CheckoutForm";
import { storageKey, serialize, type CartState } from "@/lib/cart";

const postGuestOrder = vi.fn();
vi.mock("@/lib/api", () => ({
  postGuestOrder: (...args: unknown[]) => postGuestOrder(...args),
  postCartPing: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// This vitest+jsdom combo exposes an inert window.localStorage (no methods);
// install a real in-memory implementation for CartProvider/cart-session.
const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(window, "localStorage", {
  value: memoryStorage,
  configurable: true,
});

const TENANT = "t1";
const cart: CartState = {
  currency: "NPR",
  items: [
    {
      productId: "11111111-1111-4111-8111-111111111111",
      productName: "Mug",
      unitPrice: 500,
      quantity: 2,
      imageUrl: null,
      variationId: null,
      subVariationId: null,
      variationLabel: null,
    },
  ],
};

function renderCheckout() {
  window.localStorage.setItem(storageKey(TENANT), serialize(cart));
  return render(
    <CartProvider tenantId={TENANT} host="t1.example.com">
      <CheckoutForm host="t1.example.com" tenantId={TENANT} />
    </CartProvider>,
  );
}

// The checkout renders desktop AND mobile layouts (CSS hides one), so
// every field/button exists twice — always target the first instance.
const firstByPlaceholder = (text: string | RegExp) =>
  screen.getAllByPlaceholderText(text)[0]!;
const firstSubmitButton = () =>
  screen.getAllByRole("button", { name: /place order/i })[0]!;

async function fillValidForm() {
  await screen.findAllByPlaceholderText("Your name");
  fireEvent.change(firstByPlaceholder("Your name"), {
    target: { value: "Asha" },
  });
  fireEvent.change(firstByPlaceholder(/98xxxxxxxx/), {
    target: { value: "9800000000" },
  });
}

describe("CheckoutForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    postGuestOrder.mockReset();
  });

  it("rejects a too-short phone number without calling the API", async () => {
    renderCheckout();
    await screen.findAllByPlaceholderText("Your name");
    fireEvent.change(firstByPlaceholder("Your name"), {
      target: { value: "Asha" },
    });
    fireEvent.change(firstByPlaceholder(/98xxxxxxxx/), {
      target: { value: "12" },
    });
    fireEvent.click(firstSubmitButton());

    expect(
      (await screen.findAllByText(/valid phone number/i)).length,
    ).toBeGreaterThan(0);
    expect(postGuestOrder).not.toHaveBeenCalled();
  });

  it("submits once even when the form is submitted twice rapidly", async () => {
    // Keep the first request in flight so the second submit hits the guard.
    let resolveOrder: (v: unknown) => void = () => {};
    postGuestOrder.mockImplementation(
      () => new Promise((resolve) => (resolveOrder = resolve)),
    );
    renderCheckout();
    await fillValidForm();

    const form = firstSubmitButton().closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form); // double-submit (Enter + click, double-click…)

    expect(postGuestOrder).toHaveBeenCalledTimes(1);
    resolveOrder({ orderCode: "ORD-1" });
    await waitFor(() =>
      expect(screen.getAllByText(/ORD-1/).length).toBeGreaterThan(0),
    );
  });

  it("sends server-recomputable line totals for each cart line", async () => {
    postGuestOrder.mockResolvedValue({ orderCode: "ORD-2" });
    renderCheckout();
    await fillValidForm();
    fireEvent.click(firstSubmitButton());

    await waitFor(() => expect(postGuestOrder).toHaveBeenCalledTimes(1));
    const payload = postGuestOrder.mock.calls[0]?.[2] as {
      items: Array<{ unitPrice: number; quantity: number; lineTotal: number }>;
    };
    expect(payload.items[0]?.lineTotal).toBe(
      payload.items[0]!.unitPrice * payload.items[0]!.quantity,
    );
  });

  it("on success shows the order code and clears the cart", async () => {
    postGuestOrder.mockResolvedValue({ orderCode: "ORD-77" });
    renderCheckout();
    await fillValidForm();
    fireEvent.click(firstSubmitButton());

    await waitFor(() =>
      expect(screen.getAllByText(/ORD-77/).length).toBeGreaterThan(0),
    );
    const stored = window.localStorage.getItem(storageKey(TENANT));
    expect(JSON.parse(stored!).items).toHaveLength(0);
  });
});
