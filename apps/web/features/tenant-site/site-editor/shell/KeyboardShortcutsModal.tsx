/**
 * Modal displaying all keyboard shortcuts.
 */

import React from "react";
import { X } from "lucide-react";
import { EDITOR_SHORTCUTS } from "../keyboard/shortcuts";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal = React.forwardRef<
  HTMLDivElement,
  KeyboardShortcutsModalProps
>(({ isOpen, onClose }, ref) => {
  if (!isOpen) return null;

  const categories = ["editing", "navigation", "view", "history"] as const;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-2000">
      <div
        ref={ref}
        className="bg-white rounded-lg shadow-xl max-w-2xl max-h-96 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b bg-white">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {categories.map((category) => {
            const shortcuts = EDITOR_SHORTCUTS.filter(
              (s) => s.category === category,
            );
            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-900 capitalize mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 font-mono text-xs">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

KeyboardShortcutsModal.displayName = "KeyboardShortcutsModal";
