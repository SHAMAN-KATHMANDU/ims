import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/layout/error-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ErrorScreen
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      actions={
        <>
          <Button asChild className="w-full">
            <Link href="/">Go home</Link>
          </Button>
        </>
      }
    />
  );
}
