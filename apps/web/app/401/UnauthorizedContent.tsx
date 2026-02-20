"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/layout/error-page";

/**
 * Workspace-aware login link: use first path segment as workspace slug when present and valid, else fallback to home.
 */
function getLoginHref(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];
  const reserved = ["401", "login", "admin"];
  if (slug && !reserved.includes(slug)) return `/${slug}/login`;
  return "/";
}

export default function UnauthorizedContent() {
  const pathname = usePathname();
  const loginHref = getLoginHref(pathname ?? "");

  return (
    <ErrorScreen
      title="Unauthorized Access"
      description="You don't have permission to access this page. Please log in to continue."
      actions={
        <Button asChild className="w-full">
          <Link href={loginHref}>Go to Login</Link>
        </Button>
      }
    />
  );
}
