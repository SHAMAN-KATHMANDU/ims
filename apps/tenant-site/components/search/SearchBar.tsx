"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`);
    } else {
      router.push("/products");
    }
    inputRef.current?.blur();
  };

  return (
    <form
      onSubmit={submit}
      className={className}
      role="search"
      aria-label="Product search"
      style={{ position: "relative" }}
    >
      <label htmlFor="site-search-input" className="sr-only">
        Search products
      </label>
      <input
        ref={inputRef}
        id="site-search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        enterKeyHint="search"
        style={{
          width: "100%",
          padding: "0.65rem 2.25rem 0.65rem 2.1rem",
          minHeight: 44,
          fontSize: "0.9rem",
          borderRadius: "var(--radius, 6px)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "0.6rem",
          top: "50%",
          transform: "translateY(-50%)",
          width: "1rem",
          height: "1rem",
          color: "var(--color-muted)",
          pointerEvents: "none",
        }}
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          style={{
            position: "absolute",
            right: "0.25rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-muted)",
            padding: "0.5rem",
            minWidth: 32,
            minHeight: 32,
            lineHeight: 1,
            fontSize: "1.1rem",
          }}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </form>
  );
}

export function SearchToggle() {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div
        role="search"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 1rem",
          background: "var(--color-background)",
          zIndex: 50,
        }}
      >
        <SearchBar className="flex-1" />
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Close search"
          style={{
            marginLeft: "0.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "var(--color-text)",
            padding: "0.5rem",
            minHeight: 44,
            minWidth: 44,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--color-text)",
        padding: "0.5rem",
        minWidth: 44,
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Open search"
      aria-expanded={false}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        style={{ width: "1.15rem", height: "1.15rem" }}
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
