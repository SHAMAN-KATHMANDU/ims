"use client";

import React from "react";
import type { ThemeTokens } from "@repo/shared";

interface SpacingShapeMotionEditorProps {
  theme: ThemeTokens;
  onChange: (theme: ThemeTokens) => void;
}

export function SpacingShapeMotionEditor({
  theme: _theme,
  onChange: _onChange,
}: SpacingShapeMotionEditorProps) {
  // Placeholder for spacing, shape, and motion editors
  // These will be expanded based on ThemeTokens schema

  return (
    <div className="space-y-4 text-sm text-gray-500">
      <p>Spacing, shape, and motion settings coming soon.</p>
      <p>
        Check{" "}
        <code className="bg-gray-100 px-1 rounded">
          packages/shared/src/site-schema/theme.ts
        </code>{" "}
        for the full schema.
      </p>
    </div>
  );
}
