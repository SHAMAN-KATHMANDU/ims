"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ims.shamankathmandu.com";

export default function Page() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "");
    if (!trimmed) {
      setError("Please enter your organization slug");
      return;
    }
    setError(null);
    router.push(`/${trimmed}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Inventory Management System</h1>
        <p className="text-muted-foreground">
          Enter your organization&apos;s slug to continue:
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <span className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
              {baseUrl}/
            </span>
            <Input
              type="text"
              placeholder="your-org"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setError(null);
              }}
              className="flex-1 font-mono"
              autoComplete="off"
              aria-label="Organization slug"
            />
          </div>
          {error && (
            <p className="text-left text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full">
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          You will have received a URL like {baseUrl}/<em>your-org</em>. Enter
          the part after the slash. If you don&apos;t have a link, contact your
          administrator.
        </p>
      </div>
    </div>
  );
}
