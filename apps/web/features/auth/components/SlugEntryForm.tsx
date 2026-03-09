"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLoginPath } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "Enter your organization slug";
  if (!SLUG_REGEX.test(trimmed)) {
    return "Use only letters, numbers, and hyphens (e.g. your-org)";
  }
  return null;
}

export function SlugEntryForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim().toLowerCase();
    const validationError = validateSlug(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    router.push(getLoginPath(trimmed));
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="your-org"
          value={value}
          className="flex-1 font-mono lowercase"
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          aria-label="Organization slug"
          aria-invalid={!!error}
          aria-describedby={error ? "slug-error" : undefined}
          autoComplete="organization"
        />
        <Button type="submit">Go</Button>
      </div>
      {error && (
        <p id="slug-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
