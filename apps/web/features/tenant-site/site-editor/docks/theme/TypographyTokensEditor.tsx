"use client";

import React from "react";
import type { ThemeTokens } from "@repo/shared";

interface TypographyTokensEditorProps {
  theme: ThemeTokens;
  onChange: (theme: ThemeTokens) => void;
}

export function TypographyTokensEditor({
  theme,
  onChange,
}: TypographyTokensEditorProps) {
  const typography = theme.typography || {
    heading: { fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700 },
    body: {
      fontFamily: "system-ui, sans-serif",
      fontSize: 16,
      fontWeight: 400,
    },
    baseSize: 16,
    scaleRatio: 1.125,
  };

  const handleChange = (
    key: "baseSize" | "scaleRatio",
    value: string | number,
  ) => {
    const updated = {
      ...theme,
      typography: {
        ...typography,
        [key]: value,
      },
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
        Font customization available in Phase 4
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Base Font Size: {typography.baseSize}px
        </label>
        <input
          type="range"
          min="12"
          max="20"
          value={typography.baseSize || 16}
          onChange={(e) => handleChange("baseSize", parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scale Ratio: {(typography.scaleRatio || 1.125).toFixed(3)}
        </label>
        <input
          type="range"
          min="1"
          max="1.5"
          step="0.01"
          value={typography.scaleRatio || 1.125}
          onChange={(e) =>
            handleChange("scaleRatio", parseFloat(e.target.value))
          }
          className="w-full"
        />
      </div>
    </div>
  );
}
