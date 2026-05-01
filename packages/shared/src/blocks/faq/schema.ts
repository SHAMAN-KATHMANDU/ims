import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * FAQ props — accordion of questions + answers.
 */
export interface FaqProps {
  heading?: string;
  items: { question: string; answer: string }[];
  variant?: "bordered" | "minimal" | "card";
}

/**
 * Zod schema for faq props validation.
 */
export const FaqSchema = z
  .object({
    heading: optStr(200),
    items: z
      .array(
        z
          .object({
            question: str(300),
            answer: z.string().max(3000),
          })
          .strict(),
      )
      .max(50),
    variant: z.enum(["bordered", "minimal", "card"]).optional(),
  })
  .strict();

export type FaqInput = z.infer<typeof FaqSchema>;
