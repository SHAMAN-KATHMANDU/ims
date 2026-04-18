"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * On mobile, product form is complex and state lives in ProductPage.
 * Redirect to product list with ?add=1 so the list page can open the add dialog.
 */
export function ProductNewPage() {
  const router = useRouter();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  useEffect(() => {
    router.replace(`${basePath}/products?add=1`);
  }, [router, basePath]);

  return (
    <div
      className="flex items-center justify-center p-8 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Redirecting to product form...
    </div>
  );
}
