"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * On mobile, product form is complex and state lives in ProductPage.
 * Redirect to product list with ?edit=id so the list page can open the edit dialog.
 */
export function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  useEffect(() => {
    if (id) {
      router.replace(`${basePath}/products?edit=${id}`);
    } else {
      router.replace(`${basePath}/products`);
    }
  }, [router, basePath, id]);

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
