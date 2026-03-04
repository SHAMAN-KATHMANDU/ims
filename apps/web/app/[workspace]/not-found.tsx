"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/layout/error-page";

export default function WorkspaceNotFound() {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const workspace = segments[0];
  const homeHref = workspace ? `/${workspace}` : "/";

  return (
    <ErrorScreen
      title="Page not found"
      description="The page you're looking for doesn't exist in this workspace."
      actions={
        <Button asChild className="w-full">
          <Link href={homeHref}>Go home</Link>
        </Button>
      }
    />
  );
}
