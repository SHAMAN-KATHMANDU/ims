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
