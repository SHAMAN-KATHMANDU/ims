"use client";

import React from "react";
import type { ThemeTokens } from "@repo/shared";

interface ColorTokensEditorProps {
  theme: ThemeTokens;
  onChange: (theme: ThemeTokens) => void;
}

const COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "text",
  "background",
  "surface",
  "border",
  "muted",
  "ring",
] as const;

export function ColorTokensEditor({ theme, onChange }: ColorTokensEditorProps) {
  const handleColorChange = (
    colorKey: (typeof COLOR_KEYS)[number],
    value: string,
  ) => {
    if (!theme.colors) {
      return;
    }
    const updated = {
      ...theme,
      colors: {
        ...theme.colors,
        [colorKey]: value,
      },
    };
    onChange(updated);
  };

  const colors = theme.colors || {};

  return (
    <div className="space-y-4">
      {COLOR_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
              {key}
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded border border-gray-300"
                style={{ backgroundColor: colors[key] || "#000000" }}
              />
              <input
                type="text"
                value={colors[key] || ""}
                onChange={(e) => handleColorChange(key, e.target.value)}
                placeholder="#000000"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
