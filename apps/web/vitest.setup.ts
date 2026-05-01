import "@testing-library/jest-dom";
import React from "react";
(globalThis as typeof globalThis & { React: typeof React }).React = React;

// jsdom does not provide ResizeObserver — Radix UI (Select, etc.) needs it
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Radix Select uses scrollIntoView — jsdom does not implement it
Element.prototype.scrollIntoView = () => {};

// jsdom provides localStorage, but sometimes it's not available in the test global scope
// Ensure localStorage is available for tests
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};

  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key in store) {
        delete store[key];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
  } as Storage;
}
