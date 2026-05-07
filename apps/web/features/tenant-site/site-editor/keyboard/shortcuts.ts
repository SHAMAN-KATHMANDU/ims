/**
 * Canonical list of keyboard shortcuts for the site editor.
 * Used by useEditorKeyboard and KeyboardShortcutsModal.
 */

export interface Shortcut {
  key: string;
  label: string;
  description: string;
  category: "editing" | "navigation" | "view" | "history";
}

export const EDITOR_SHORTCUTS: readonly Shortcut[] = [
  // Editing
  {
    key: "Delete",
    label: "Delete",
    description: "Delete the selected block",
    category: "editing",
  },
  {
    key: "⌘D",
    label: "Duplicate",
    description: "Duplicate the selected block",
    category: "editing",
  },
  {
    key: "/",
    label: "Insert",
    description: 'Type "/" in a text field to insert a block',
    category: "editing",
  },

  // Navigation
  {
    key: "↑ ↓",
    label: "Move up / down",
    description: "Move the selected block in the tree",
    category: "navigation",
  },
  {
    key: "⌘↑ ⌘↓",
    label: "Reorder outline",
    description: "Reorder selected block in the outline",
    category: "navigation",
  },
  {
    key: "Esc",
    label: "Deselect",
    description: "Deselect the current block",
    category: "navigation",
  },

  // View
  {
    key: "⌘Z",
    label: "Undo",
    description: "Undo the last change",
    category: "history",
  },
  {
    key: "⌘⇧Z",
    label: "Redo",
    description: "Redo the last undone change",
    category: "history",
  },

  // View (device)
  {
    key: "⌘1",
    label: "Desktop view",
    description: "Switch to desktop preview",
    category: "view",
  },
  {
    key: "⌘2",
    label: "Tablet view",
    description: "Switch to tablet preview",
    category: "view",
  },
  {
    key: "⌘3",
    label: "Mobile view",
    description: "Switch to mobile preview",
    category: "view",
  },
];

export const shortcutsByCategory = (category?: string) => {
  if (!category) return EDITOR_SHORTCUTS;
  return EDITOR_SHORTCUTS.filter((s) => s.category === category);
};

export const getShortcutLabel = (key: string): string | undefined => {
  return EDITOR_SHORTCUTS.find((s) => s.key === key)?.label;
};
