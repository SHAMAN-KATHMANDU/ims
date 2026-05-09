"use client";

import { useRouter, useParams } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useCmdKStore } from "@/store/cmdk-store";
import { useThemeStore } from "@/store/theme-store";
import { Icon, type IconName } from "../icons";

interface CmdItem {
  label: string;
  icon?: IconName;
  action?: string;
  target?: string;
  kbd?: string;
}

interface CmdGroup {
  group: string;
  items: CmdItem[];
}

const CMDK_ITEMS: CmdGroup[] = [
  {
    group: "Jump to",
    items: [
      { label: "Dashboard", icon: "gauge", target: "dashboard" },
      { label: "Pages", icon: "pages", target: "pages" },
      { label: "Blog", icon: "blog", target: "blog" },
      { label: "Blocks", icon: "blocks", target: "blocks" },
      { label: "Snippets", icon: "snippets", target: "snippets" },
      { label: "Media", icon: "media", target: "media" },
      { label: "Collections", icon: "collections", target: "collections" },
      { label: "Offers", icon: "offers", target: "offers" },
      { label: "Navigation", icon: "navigation", target: "navigation" },
      { label: "Design", icon: "design", target: "design" },
      { label: "Domains", icon: "domains", target: "domains" },
      { label: "SEO & Redirects", icon: "seo", target: "seo" },
      { label: "Forms", icon: "forms", target: "forms" },
      { label: "Settings", icon: "settings", target: "settings" },
    ],
  },
  {
    group: "Actions",
    items: [
      { label: "New page", icon: "plus", action: "new-page" },
      { label: "New blog post", icon: "plus", action: "new-post" },
      { label: "Toggle theme", icon: "design", action: "theme", kbd: "⌘ ⇧ L" },
    ],
  },
  {
    group: "Recent",
    items: [
      { label: "Home · /", icon: "pages", target: "builder" },
      { label: "Menu · /menu", icon: "pages", target: "builder" },
      { label: "Why we cook with almond wood", icon: "blog", target: "post" },
    ],
  },
];

export function CmdK() {
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const open = useCmdKStore((state) => state.open);
  const setOpen = useCmdKStore((state) => state.setOpen);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const handleSelect = (item: CmdItem) => {
    if (item.target && workspace) {
      router.push(`/${workspace}/content/${item.target}`);
    } else if (item.action === "theme") {
      toggleTheme();
    }
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump…" />
      <CommandList>
        {CMDK_ITEMS.map((group, idx) => (
          <div key={group.group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.label}
                  value={item.label}
                  onSelect={() => handleSelect(item)}
                  style={{ cursor: "pointer" }}
                >
                  {item.icon && (
                    <Icon name={item.icon} size={14} className="mr-2" />
                  )}
                  <span>{item.label}</span>
                  {item.kbd && (
                    <span
                      className="mono ml-auto text-xs"
                      style={{
                        color: "var(--ink-4)",
                        padding: "2px 4px",
                        backgroundColor: "var(--bg-sunken)",
                        borderRadius: "2px",
                      }}
                    >
                      {item.kbd}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
