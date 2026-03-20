"use client";

import { cn } from "@/lib/utils";

interface ParticipantAvatarProps {
  /** Public HTTPS URL from the messaging provider */
  imageUrl?: string | null;
  /** Used for initial fallback */
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const dimensions: Record<
  NonNullable<ParticipantAvatarProps["size"]>,
  { box: string; text: string }
> = {
  sm: { box: "size-8", text: "text-xs" },
  md: { box: "size-10", text: "text-sm" },
  lg: { box: "size-12", text: "text-base" },
};

export function ParticipantAvatar({
  imageUrl,
  name,
  size = "md",
  className,
}: ParticipantAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const { box, text } = dimensions[size];

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={cn(box, "shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        box,
        text,
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary",
        className,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}
