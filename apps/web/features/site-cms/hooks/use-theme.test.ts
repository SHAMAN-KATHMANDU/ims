import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./use-theme";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useTheme", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Create a mock shell element
    const shell = document.createElement("div");
    shell.setAttribute("data-cms-shell", "");
    document.body.appendChild(shell);
  });

  afterEach(() => {
    localStorageMock.clear();
    const shell = document.querySelector("[data-cms-shell]");
    if (shell) shell.remove();
  });

  it("initializes with light theme", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("persists theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setTheme("dark");
    });
    expect(localStorage.getItem("site-cms-theme")).toBe("dark");
  });

  it("reads theme from localStorage on mount", () => {
    localStorage.setItem("site-cms-theme", "dark");
    const { result } = renderHook(() => useTheme());
    // Wait for mount effect to run
    expect(result.current.theme).toBe("dark");
  });

  it("toggles between light and dark", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe("dark");
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe("light");
  });

  it("applies data-theme attribute to shell", () => {
    const { result } = renderHook(() => useTheme());
    const shell = document.querySelector("[data-cms-shell]");
    act(() => {
      result.current.setTheme("dark");
    });
    expect(shell).toHaveAttribute("data-theme", "dark");
    act(() => {
      result.current.setTheme("light");
    });
    expect(shell).not.toHaveAttribute("data-theme");
  });

  it("listens for toggle-theme event", () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      window.dispatchEvent(new CustomEvent("toggle-theme"));
    });
    expect(result.current.theme).toBe("dark");
  });
});
