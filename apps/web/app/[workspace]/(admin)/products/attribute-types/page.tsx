"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AttributeTypesRedirect() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";

  useEffect(() => {
    router.replace(
      `/${workspace}/products/catalog-settings?tab=attribute-types`,
    );
  }, [workspace, router]);

  return null;
}
