"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getLoginPath } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlugSchema, type SlugInput } from "../validation";

export function SlugEntryForm() {
  const router = useRouter();

  const form = useForm<SlugInput>({
    resolver: zodResolver(SlugSchema),
    mode: "onBlur",
    defaultValues: { slug: "" },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const trimmed = values.slug.trim().toLowerCase();
    router.push(getLoginPath(trimmed));
  });

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="flex gap-2">
        <Controller
          name="slug"
          control={form.control}
          render={({ field }) => (
            <Input
              type="text"
              placeholder="your-org"
              {...field}
              value={field.value}
              onChange={(e) =>
                field.onChange(
                  e.target.value.toLowerCase().replace(/\s+/g, "-"),
                )
              }
              className="flex-1 font-mono lowercase"
              aria-label="Organization slug"
              aria-invalid={!!form.formState.errors.slug}
              aria-describedby={
                form.formState.errors.slug ? "slug-error" : undefined
              }
              autoComplete="organization"
            />
          )}
        />
        <Button type="submit">Go</Button>
      </div>
      {form.formState.errors.slug && (
        <p
          id="slug-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {form.formState.errors.slug.message}
        </p>
      )}
    </form>
  );
}
