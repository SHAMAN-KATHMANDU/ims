"use client";

import { useEffect, type JSX } from "react";
import { useRouter } from "next/navigation";

export function NavigationRoute(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    router.replace("./editor?scope=header");
  }, [router]);

  return <div />;
}
