"use client";

import { useState } from "react";
import { usePageQuery, useUpdatePage } from "../../hooks/use-pages";

interface SeoTabProps {
  _workspace: string;
  pageId: string;
  scope: string;
}

export function SeoTab({ pageId, scope }: SeoTabProps) {
  const { data: page } = usePageQuery(pageId);
  const updatePage = useUpdatePage();

  const seoTitle = page?.seoTitle || page?.title || "";
  const seoDescription = page?.seoDescription || "";
  const coverImage = page?.coverImageUrl || "";

  const [title, setTitle] = useState(seoTitle);
  const [description, setDescription] = useState(seoDescription);
  const [image, setImage] = useState(coverImage);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Note: seoTitle may not be updatable via this API yet
  };

  const handleDescriptionChange = (newDesc: string) => {
    setDescription(newDesc);
    // Note: seoDescription may not be updatable via this API yet
  };

  const handleImageChange = (newImage: string) => {
    setImage(newImage);
    updatePage.mutate({ id: pageId, payload: { coverImageUrl: newImage } });
  };

  return (
    <div
      className="p-3.5 flex flex-col gap-3.5"
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Search section */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Search
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Title tag
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full h-7 px-2 rounded text-xs"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            <div className="mt-1 text-xs" style={{ color: "var(--ink-4)" }}>
              {title.length} / 60 chars
            </div>
          </div>

          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Meta description
            </div>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={2}
              className="w-full p-2 rounded text-xs"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
            <div className="mt-1 text-xs" style={{ color: "var(--ink-4)" }}>
              {description.length} / 160 chars
            </div>
          </div>
        </div>
      </div>

      {/* Social image section */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Social image
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
            OG Image URL
          </div>
          <input
            type="text"
            value={image}
            onChange={(e) => handleImageChange(e.target.value)}
            placeholder="https://example.com/og-image.jpg"
            className="w-full h-7 px-2 rounded text-xs"
            style={{
              border: "1px solid var(--line)",
              backgroundColor: "var(--bg-elev)",
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Social preview */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Preview
        </div>
        <div
          className="border rounded overflow-hidden"
          style={{
            backgroundColor: "var(--bg-sunken)",
            borderColor: "var(--line)",
          }}
        >
          {image ? (
            <div
              style={{
                aspectRatio: "1.91 / 1",
                backgroundImage: `url(${image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <div
              style={{
                aspectRatio: "1.91 / 1",
                background:
                  "linear-gradient(135deg, oklch(0.45 0.06 50), oklch(0.28 0.05 30))",
              }}
            />
          )}
          <div className="p-2">
            <div
              className="text-xs font-mono"
              style={{ color: "var(--ink-4)" }}
            >
              {page?.slug || scope}
            </div>
            <div
              className="text-xs font-semibold mt-1 truncate"
              style={{ color: "var(--ink)" }}
            >
              {title || "Page Title"}
            </div>
            <div
              className="text-xs mt-1 line-clamp-2"
              style={{ color: "var(--ink-3)" }}
            >
              {description || "Page description"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
