"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigation, useUpdateNavigation } from "./use-navigation";
import { Check, Plus, MoreVertical } from "lucide-react";
import type { NavigationData, NavLink } from "./types";

export function NavigationEditorView() {
  const [tab, setTab] = useState("primary");
  const { data: navData, isLoading } = useNavigation();
  const updateNav = useUpdateNavigation();

  const [localData, setLocalData] = useState<NavigationData | null>(null);

  const current = localData || navData;

  const handleSave = () => {
    if (current) {
      updateNav.mutate(current);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-3">
        Loading navigation…
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Navigation & footer
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Top navigation, footer columns, and site-wide announcements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocalData(null)}
            disabled={!localData}
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={!localData || updateNav.isPending}
            className="gap-2 bg-accent text-bg hover:bg-accent/90"
          >
            <Check className="w-4 h-4" />
            {updateNav.isPending ? "Saving…" : "Save & publish"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="border-b border-line bg-transparent p-0 w-full justify-start rounded-none">
          <TabsTrigger
            value="primary"
            className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-ink data-[state=active]:bg-transparent"
          >
            Primary nav
          </TabsTrigger>
          <TabsTrigger
            value="footer"
            className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-ink data-[state=active]:bg-transparent"
          >
            Footer
          </TabsTrigger>
          <TabsTrigger
            value="announce"
            className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-ink data-[state=active]:bg-transparent"
          >
            Announcement bar
          </TabsTrigger>
          <TabsTrigger
            value="mobile"
            className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-ink data-[state=active]:bg-transparent"
          >
            Mobile menu
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-[1fr_360px] gap-4">
          {/* Primary Nav */}
          <TabsContent value="primary" className="space-y-4">
            <div className="border border-line rounded-lg bg-bg-elev p-3 space-y-2">
              <div className="flex items-center justify-between px-2 py-1 border-b border-line pb-2">
                <div className="text-sm font-medium">Primary navigation</div>
                <Button size="sm" variant="ghost" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add link
                </Button>
              </div>
              <div className="text-sm text-ink-3">
                (Navigation stub — TODO: wire to nav data state)
              </div>
            </div>
          </TabsContent>

          {/* Footer */}
          <TabsContent value="footer" className="space-y-4">
            <div className="border border-line rounded-lg bg-bg-elev p-4">
              <div className="grid grid-cols-3 gap-4">
                {current.footer.map((col) => (
                  <div
                    key={col.id}
                    className="border border-line rounded-lg p-3 bg-bg-sunken space-y-2"
                  >
                    <div className="flex items-center gap-2 justify-between">
                      <div className="text-sm font-medium">{col.title}</div>
                      <button className="text-ink-4 hover:text-ink">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    {col.links.map((link) => (
                      <div
                        key={link.id}
                        className="text-xs text-ink-3 truncate"
                      >
                        {link.label}
                      </div>
                    ))}
                  </div>
                ))}
                <button className="border-2 border-dashed border-line rounded-lg p-3 text-ink-4 hover:text-ink transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add column
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Announcement */}
          <TabsContent value="announce" className="space-y-4">
            <div className="border border-line rounded-lg bg-bg-elev p-4 space-y-4">
              {current.announcementBar && (
                <div className="flex items-center gap-3 px-3 py-2 bg-ink text-bg rounded-lg text-sm">
                  <span>⚡</span>
                  <span className="flex-1">
                    {current.announcementBar.message}
                  </span>
                  <span className="text-xs opacity-70">View</span>
                  <span>✕</span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-ink block mb-1">
                    Message
                  </label>
                  <Input placeholder="Announcement message" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink block mb-1">
                    Link target
                  </label>
                  <Input placeholder="/path" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink block mb-1">
                    Style
                  </label>
                  <Select defaultValue="dark">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark band</SelectItem>
                      <SelectItem value="soft">Soft</SelectItem>
                      <SelectItem value="accent">Accent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mobile */}
          <TabsContent value="mobile" className="space-y-4">
            <div className="border border-line rounded-lg bg-bg-elev p-4 text-sm text-ink-3 space-y-3">
              <p>
                Mobile menu inherits the primary nav by default. Toggle below to
                customize.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Customize mobile menu</span>
              </label>
            </div>
          </TabsContent>

          {/* Live Preview Sidebar */}
          <div className="space-y-4">
            <div className="border border-line rounded-lg bg-bg-elev p-3 space-y-2">
              <div className="text-xs font-mono text-ink-4 uppercase tracking-wide">
                Live preview
              </div>
              <div className="border border-line rounded-lg overflow-hidden bg-bg-elev">
                <div className="h-14 px-4 border-b border-line flex items-center gap-3 bg-bg">
                  <span className="font-serif text-base font-semibold">L</span>
                  <div className="flex gap-4 ml-auto text-xs">
                    {current.primaryNav.slice(0, 5).map((item) => (
                      <span key={item.id} className="text-ink-2">
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-8 text-center text-xs text-ink-4 bg-bg-sunken">
                  page content
                </div>
                <div className="p-4 border-t border-line grid grid-cols-3 gap-3 text-xs bg-bg-sunken">
                  {current.footer.map((col) => (
                    <div key={col.id}>
                      <div className="font-mono text-2xs text-ink-4 uppercase mb-1">
                        {col.title}
                      </div>
                      {col.links.slice(0, 3).map((link) => (
                        <div key={link.id} className="text-ink-3 text-2xs">
                          {link.label}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
