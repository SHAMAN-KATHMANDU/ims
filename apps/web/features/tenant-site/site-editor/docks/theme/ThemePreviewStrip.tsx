"use client";

import React from "react";
import type { ThemeTokens } from "@repo/shared";

interface ThemePreviewStripProps {
  theme: ThemeTokens;
}

export function ThemePreviewStrip({ theme }: ThemePreviewStripProps) {
  const colors = theme.colors || {};

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Preview
      </p>
      <div className="flex gap-2 h-8">
        {/* Primary */}
        <div
          className="flex-1 rounded border border-gray-300"
          style={{ backgroundColor: colors.primary || "#000" }}
          title="Primary"
        />
        {/* Secondary */}
        <div
          className="flex-1 rounded border border-gray-300"
          style={{ backgroundColor: colors.secondary || "#666" }}
          title="Secondary"
        />
        {/* Accent */}
        <div
          className="flex-1 rounded border border-gray-300"
          style={{ backgroundColor: colors.accent || "#999" }}
          title="Accent"
        />
        {/* Background */}
        <div
          className="flex-1 rounded border border-gray-300"
          style={{ backgroundColor: colors.background || "#fff" }}
          title="Background"
        />
      </div>
      <p className="text-xs text-gray-500">
        {colors.primary && `Primary: ${colors.primary}`}
      </p>
    </div>
  );
}
