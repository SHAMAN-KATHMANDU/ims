"use client";

import React, { useState } from "react";
import type { ThemeTokens } from "@repo/shared";
import { ColorTokensEditor } from "./ColorTokensEditor";
import { TypographyTokensEditor } from "./TypographyTokensEditor";
import { SpacingShapeMotionEditor } from "./SpacingShapeMotionEditor";
import { ThemePreviewStrip } from "./ThemePreviewStrip";

type ThemeTab = "colors" | "typography" | "spacing" | "motion";

interface ThemePanelProps {
  theme: ThemeTokens;
  onThemeChange?: (theme: ThemeTokens) => void;
}

export function ThemePanel({ theme, onThemeChange }: ThemePanelProps) {
  const [activeTab, setActiveTab] = useState<ThemeTab>("colors");

  const handleThemeChange = (updated: ThemeTokens) => {
    onThemeChange?.(updated);
  };

  const tabs: { id: ThemeTab; label: string }[] = [
    { id: "colors", label: "Colors" },
    { id: "typography", label: "Typography" },
    { id: "spacing", label: "Spacing & Shape" },
    { id: "motion", label: "Motion" },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Theme preview strip */}
      <div className="border-b border-gray-200 flex-shrink-0 p-3">
        <ThemePreviewStrip theme={theme} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <div className="flex gap-0 px-3 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === "colors" && (
          <ColorTokensEditor theme={theme} onChange={handleThemeChange} />
        )}
        {activeTab === "typography" && (
          <TypographyTokensEditor theme={theme} onChange={handleThemeChange} />
        )}
        {activeTab === "spacing" && (
          <SpacingShapeMotionEditor
            theme={theme}
            onChange={handleThemeChange}
          />
        )}
        {activeTab === "motion" && (
          <SpacingShapeMotionEditor
            theme={theme}
            onChange={handleThemeChange}
          />
        )}
      </div>

      {/* Save button */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0">
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors">
          Save Theme
        </button>
      </div>
    </div>
  );
}
