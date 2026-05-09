"use client";

import { useState } from "react";
import {
  useNavigationConfig,
  useDebouncedNavigationSave,
} from "../use-navigation";
import { NavItemEditor } from "./NavItemEditor";
import { Button } from "@/components/ui/button";
import { Plus, Loader } from "lucide-react";
import type {
  NavItem,
  NavColumn,
  NavigationTab,
  NavigationConfig,
} from "../types";

export function NavigationView() {
  const { data: navigation, isLoading } = useNavigationConfig();
  const { debouncedSave, isPending } = useDebouncedNavigationSave();

  const [activeTab, setActiveTab] = useState<NavigationTab>("primary");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [config, setConfig] = useState<NavigationConfig | null>(
    navigation || null,
  );

  // Update local config when data changes
  if (navigation !== undefined && config === null) {
    setConfig(
      navigation || {
        primary: [],
        utility: [],
        footer: [],
      },
    );
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ink-3 flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          Loading navigation...
        </div>
      </div>
    );
  }

  const generateId = () =>
    `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const handleConfigChange = (newConfig: NavigationConfig) => {
    setConfig(newConfig);
    debouncedSave(newConfig);
  };

  const handleAddPrimaryItem = () => {
    const newItem: NavItem = {
      id: generateId(),
      label: "New item",
      href: "/",
      children: [],
    };
    handleConfigChange({
      ...config,
      primary: [...config.primary, newItem],
    });
  };

  const handleAddUtilityItem = () => {
    const newItem: NavItem = {
      id: generateId(),
      label: "New item",
      href: "/",
    };
    handleConfigChange({
      ...config,
      utility: [...config.utility, newItem],
    });
  };

  const handleAddColumn = () => {
    const newColumn: NavColumn = {
      id: generateId(),
      title: "New column",
      items: [],
    };
    handleConfigChange({
      ...config,
      footer: [...config.footer, newColumn],
    });
  };

  const handleAddFooterItem = (columnId: string) => {
    const newItem: NavItem = {
      id: generateId(),
      label: "New item",
      href: "/",
    };
    handleConfigChange({
      ...config,
      footer: config.footer.map((col) =>
        col.id === columnId ? { ...col, items: [...col.items, newItem] } : col,
      ),
    });
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Navigation</h1>
        <p className="text-sm text-ink-3">
          Configure primary, utility, and footer navigation menus.
        </p>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <Loader className="w-3 h-3 animate-spin" />
          Saving...
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-line">
        {(["primary", "utility", "footer"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? "text-accent border-accent"
                : "text-ink-3 border-transparent hover:text-ink"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Primary nav */}
      {activeTab === "primary" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-3 mb-3">
              Top navigation bar. Up to 2 levels of nesting.
            </p>
            <div className="space-y-3">
              {config.primary.length === 0 ? (
                <div className="text-center py-6 text-ink-4 border border-dashed border-line rounded">
                  No items yet
                </div>
              ) : (
                config.primary.map((item) => (
                  <NavItemEditor
                    key={item.id}
                    item={item}
                    isExpanded={expandedItems.has(item.id)}
                    onToggleExpand={() => toggleExpanded(item.id)}
                    onUpdate={(updated) => {
                      handleConfigChange({
                        ...config,
                        primary: config.primary.map((i) =>
                          i.id === updated.id ? updated : i,
                        ),
                      });
                    }}
                    onDelete={() => {
                      handleConfigChange({
                        ...config,
                        primary: config.primary.filter((i) => i.id !== item.id),
                      });
                    }}
                    onAddChild={() => {
                      const newChild: NavItem = {
                        id: generateId(),
                        label: "Sub-item",
                        href: "/",
                      };
                      handleConfigChange({
                        ...config,
                        primary: config.primary.map((i) =>
                          i.id === item.id
                            ? {
                                ...i,
                                children: [...(i.children || []), newChild],
                              }
                            : i,
                        ),
                      });
                    }}
                    canAddChild={!item.children?.some((c) => c.children)}
                  />
                ))
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAddPrimaryItem}
            className="h-8 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add item
          </Button>
        </div>
      )}

      {/* Utility nav */}
      {activeTab === "utility" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-3 mb-3">
              Small links above primary nav. Single level only.
            </p>
            <div className="space-y-3">
              {config.utility.length === 0 ? (
                <div className="text-center py-6 text-ink-4 border border-dashed border-line rounded">
                  No items yet
                </div>
              ) : (
                config.utility.map((item) => (
                  <NavItemEditor
                    key={item.id}
                    item={item}
                    onUpdate={(updated) => {
                      handleConfigChange({
                        ...config,
                        utility: config.utility.map((i) =>
                          i.id === updated.id ? updated : i,
                        ),
                      });
                    }}
                    onDelete={() => {
                      handleConfigChange({
                        ...config,
                        utility: config.utility.filter((i) => i.id !== item.id),
                      });
                    }}
                    canAddChild={false}
                  />
                ))
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAddUtilityItem}
            className="h-8 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add item
          </Button>
        </div>
      )}

      {/* Footer nav */}
      {activeTab === "footer" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-3 mb-3">
              Footer columns. Each column has a title and flat list of links.
            </p>
            <div className="space-y-4">
              {config.footer.length === 0 ? (
                <div className="text-center py-6 text-ink-4 border border-dashed border-line rounded">
                  No columns yet
                </div>
              ) : (
                config.footer.map((column) => (
                  <div
                    key={column.id}
                    className="border border-line rounded p-4 space-y-3"
                  >
                    {/* Column title */}
                    <input
                      type="text"
                      value={column.title}
                      onChange={(e) => {
                        handleConfigChange({
                          ...config,
                          footer: config.footer.map((col) =>
                            col.id === column.id
                              ? { ...col, title: e.target.value }
                              : col,
                          ),
                        });
                      }}
                      placeholder="Column title"
                      className="w-full px-3 py-2 border border-line rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                    />

                    {/* Column items */}
                    <div className="space-y-2 pl-4 border-l border-line-2">
                      {column.items.length === 0 ? (
                        <div className="text-xs text-ink-4 italic">
                          No items
                        </div>
                      ) : (
                        column.items.map((item) => (
                          <NavItemEditor
                            key={item.id}
                            item={item}
                            level={1}
                            onUpdate={(updated) => {
                              handleConfigChange({
                                ...config,
                                footer: config.footer.map((col) =>
                                  col.id === column.id
                                    ? {
                                        ...col,
                                        items: col.items.map((i) =>
                                          i.id === updated.id ? updated : i,
                                        ),
                                      }
                                    : col,
                                ),
                              });
                            }}
                            onDelete={() => {
                              handleConfigChange({
                                ...config,
                                footer: config.footer.map((col) =>
                                  col.id === column.id
                                    ? {
                                        ...col,
                                        items: col.items.filter(
                                          (i) => i.id !== item.id,
                                        ),
                                      }
                                    : col,
                                ),
                              });
                            }}
                            canAddChild={false}
                          />
                        ))
                      )}
                    </div>

                    {/* Add item to column */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddFooterItem(column.id)}
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add link
                    </Button>

                    {/* Delete column */}
                    <button
                      onClick={() => {
                        handleConfigChange({
                          ...config,
                          footer: config.footer.filter(
                            (col) => col.id !== column.id,
                          ),
                        });
                      }}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete column
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <Button size="sm" onClick={handleAddColumn} className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Add column
          </Button>
        </div>
      )}
    </div>
  );
}
