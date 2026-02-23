import type React from "react";
import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return {
    title: `${workspace} | Admin`,
  };
}

/**
 * Pre-render common workspace slugs at build time.
 * dynamicParams = true allows unknown slugs (e.g. tenant-specific) at request time.
 */
export function generateStaticParams() {
  return [{ workspace: "system" }, { workspace: "admin" }];
}

export const dynamicParams = true;

/**
 * Dynamic [workspace] layout. The first path segment is the tenant slug (e.g. /ruby, /system).
 * - /[slug]/login → login page (no auth required)
 * - /[slug]/... (rest) → (admin) layout with AuthGuard and DashboardLayout
 */
export default function WorkspaceLayout({ children }: Props) {
  return <>{children}</>;
}
