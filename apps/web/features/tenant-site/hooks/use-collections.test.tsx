/**
 * useSetCollectionProducts: updating a collection's products must refresh
 * BOTH the detail and list caches — the list view shows per-collection
 * product counts that went stale when only the detail was invalidated.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  type InvalidateQueryFilters,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSetCollectionProducts, collectionKeys } from "./use-collections";
import {
  useSetCollectionCmsProducts,
  collectionsCmsKeys,
} from "../collections-cms/use-collections-cms";

const setProducts = vi.fn();
vi.mock("../services/collections.service", () => ({
  collectionsService: {
    setProducts: (...args: unknown[]) => setProducts(...args),
  },
}));
const setCmsProducts = vi.fn();
vi.mock("../collections-cms/collections-cms.service", () => ({
  collectionsCmsService: {
    setProducts: (...args: unknown[]) => setCmsProducts(...args),
  },
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidated: unknown[][] = [];
  const original = qc.invalidateQueries.bind(qc);
  qc.invalidateQueries = ((filters: InvalidateQueryFilters) => {
    invalidated.push((filters?.queryKey ?? []) as unknown[]);
    return original(filters);
  }) as typeof qc.invalidateQueries;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidated };
}

describe("useSetCollectionProducts", () => {
  beforeEach(() => setProducts.mockReset());

  it("calls the service with id and productIds", async () => {
    setProducts.mockResolvedValue({});
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetCollectionProducts(), {
      wrapper,
    });
    act(() => {
      result.current.mutate({ id: "c1", productIds: ["p1", "p2"] });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(setProducts).toHaveBeenCalledWith("c1", ["p1", "p2"]);
  });

  it("invalidates BOTH the detail and the list cache on success", async () => {
    setProducts.mockResolvedValue({});
    const { wrapper, invalidated } = makeWrapper();
    const { result } = renderHook(() => useSetCollectionProducts(), {
      wrapper,
    });
    act(() => {
      result.current.mutate({ id: "c1", productIds: ["p1"] });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidated.map((k) => JSON.stringify(k));
    expect(keys).toContain(JSON.stringify(collectionKeys.detail("c1")));
    expect(keys).toContain(JSON.stringify(collectionKeys.list()));
  });

  it("the CMS variant hook also refreshes detail AND list", async () => {
    setCmsProducts.mockResolvedValue({});
    const { wrapper, invalidated } = makeWrapper();
    const { result } = renderHook(() => useSetCollectionCmsProducts(), {
      wrapper,
    });
    act(() => {
      result.current.mutate({ id: "c9", productIds: ["p1"] });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidated.map((k) => JSON.stringify(k));
    expect(keys).toContain(JSON.stringify(collectionsCmsKeys.detail("c9")));
    expect(keys).toContain(JSON.stringify(collectionsCmsKeys.list()));
  });
});
