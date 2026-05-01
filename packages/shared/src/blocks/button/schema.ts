import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

/**
 * Button props — CTA link styled as primary / outline / ghost.
 */
export interface ButtonProps {
  label: string;
  href: string;
  style: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  alignment?: "start" | "center" | "end";
  fullWidth?: boolean;
}

/**
 * Zod schema for button props validation.
 */
export const ButtonSchema = z
  .object({
    label: str(80),
    href: str(1000),
    style: z.enum(["primary", "outline", "ghost"]),
    size: z.enum(["sm", "md", "lg"]).optional(),
    alignment: z.enum(["start", "center", "end"]).optional(),
    fullWidth: z.boolean().optional(),
  })
  .strict();

export type ButtonInput = z.infer<typeof ButtonSchema>;
