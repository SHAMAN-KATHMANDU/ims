"use client";

import { useState } from "react";
import { usePageQuery, useUpdatePage } from "../../hooks/use-pages";

interface PageTabProps {
  _workspace: string;
  pageId: string;
  _scope: string;
}

export function PageTab({ pageId, _scope }: PageTabProps) {
  const { data: page } = usePageQuery(pageId);
  const updatePage = useUpdatePage();
  const [title, setTitle] = useState(page?.title || "");
  const [slug, setSlug] = useState(page?.slug || _scope || "");

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    updatePage.mutate({ id: pageId, payload: { title: newTitle } });
  };

  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    updatePage.mutate({ id: pageId, payload: { slug: newSlug } });
  };

  const isPublished = page?.isPublished || false;

  return (
    <div
      className="p-3.5 flex flex-col gap-3.5"
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Title section */}
      <div>
        <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
          Page title
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full h-7 px-2 rounded text-xs"
          style={{
            border: "1px solid var(--line)",
            backgroundColor: "var(--bg-elev)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </div>

      {/* Slug section */}
      <div>
        <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
          Slug
        </div>
        <input
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          className="w-full h-7 px-2 rounded text-xs font-mono"
          style={{
            border: "1px solid var(--line)",
            backgroundColor: "var(--bg-elev)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <div className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>
          /{slug}
        </div>
      </div>

      {/* Status section */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Status
        </div>
        <div
          className="px-2 py-1.5 rounded text-xs font-medium"
          style={{
            backgroundColor: isPublished
              ? "var(--accent-soft)"
              : "var(--bg-sunken)",
            color: isPublished ? "var(--accent)" : "var(--ink-2)",
          }}
        >
          {isPublished ? "Published" : "Draft"}
        </div>
        <div className="text-xs mt-2" style={{ color: "var(--ink-4)" }}>
          Use the Publish button in the top bar to publish.
        </div>
      </div>
    </div>
  );
}
