"use client";

import { useRouter, useParams } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  useCmdKStore,
  selectCmdKOpen,
  selectCmdKSetOpen,
} from "@/store/cmdk-store";
import { useThemeStore, selectThemeToggle } from "@/store/theme-store";
import { useRecentEdits } from "../../tenant-site/hooks/use-recent-edits";
import { Icon, type IconName } from "../icons";

interface CmdItem {
  label: string;
  icon?: IconName;
  action?: string;
  target?: string;
  pageId?: string;
  postId?: string;
  kbd?: string;
}

interface CmdGroup {
  group: string;
  items: CmdItem[];
}

const getStaticCmdGroups = (): CmdGroup[] => [
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
      { label: "Templates", icon: "templates", target: "templates" },
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
];

export function CmdK() {
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const open = useCmdKStore(selectCmdKOpen);
  const setOpen = useCmdKStore(selectCmdKSetOpen);
  const toggleTheme = useThemeStore(selectThemeToggle);
  const {
    recentPages,
    recentPosts,
    isLoading: recentLoading,
  } = useRecentEdits(5);

  const recentItems: CmdItem[] = [
    ...recentPages.map((page) => ({
      label: `${page.title} · ${page.slug}`,
      icon: "pages" as IconName,
      target: "builder",
      pageId: page.id,
    })),
    ...recentPosts.map((post) => ({
      label: post.title,
      icon: "blog" as IconName,
      target: "post",
      postId: post.id,
    })),
  ]
    .sort((a, b) => {
      const getTime = (item: CmdItem) => {
        if (item.pageId) {
          const page = recentPages.find((p) => p.id === item.pageId);
          return page ? new Date(page.updatedAt ?? 0).getTime() : 0;
        }
        if (item.postId) {
          const post = recentPosts.find((p) => p.id === item.postId);
          return post ? new Date(post.updatedAt ?? 0).getTime() : 0;
        }
        return 0;
      };
      return getTime(b) - getTime(a);
    })
    .slice(0, 5);

  const cmokGroups: CmdGroup[] = [
    ...getStaticCmdGroups(),
    ...(recentItems.length > 0 && !recentLoading
      ? [
          {
            group: "Recent",
            items: recentItems,
          },
        ]
      : []),
  ];

  const handleSelect = (item: CmdItem) => {
    if (item.pageId && workspace) {
      router.push(`/${workspace}/content/builder/${item.pageId}`);
    } else if (item.postId && workspace) {
      router.push(`/${workspace}/content/post/${item.postId}`);
    } else if (item.target && workspace) {
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
        {cmokGroups.map((group, idx) => (
          <div key={group.group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={`${item.label}-${item.pageId || item.postId || ""}`}
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
