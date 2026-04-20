import type { ReactNode } from "react";

export const metadata = { title: "Edit blog post" };

export default function EditBlogPostLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
