import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

/**
 * Express middleware that validates req.body against a Zod schema.
 * On success, replaces req.body with the parsed (and transformed) data.
 * On failure, responds with 400 and structured field errors.
 */
export function validate<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = formatZodError(result.error);
      return res.status(400).json({
        message: "Validation failed",
        errors: fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

function formatZodError(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!formatted[path]) {
      formatted[path] = issue.message;
    }
  }
  return formatted;
}
