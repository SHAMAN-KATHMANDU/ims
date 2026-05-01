import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

/**
 * Tabs — tabbed content panels.
 */
export interface TabsProps {
  tabs: { label: string; content: string }[];
  defaultTab?: number;
  variant?: "underline" | "pills" | "bordered";
  alignment?: "start" | "center";
}

/**
 * Zod schema for tabs props validation.
 */
export const TabsSchema = z
  .object({
    tabs: z
      .array(
        z
          .object({
            label: str(100),
            content: z.string().max(50_000),
          })
          .strict(),
      )
      .max(20),
    defaultTab: z.number().int().min(0).optional(),
    variant: z.enum(["underline", "pills", "bordered"]).optional(),
    alignment: z.enum(["start", "center"]).optional(),
  })
  .strict();

export type TabsInput = z.infer<typeof TabsSchema>;
