import { Request, Response, NextFunction } from "express";
import { z } from "zod";

type AnyZodSchema = z.ZodTypeAny;

export const validateBody =
  <T extends AnyZodSchema>(schema: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return res.status(400).json({
        message: firstIssue?.message ?? "Invalid input",
      });
    }

    req.body = parsed.data;
    return next();
  };

export const validateParams =
  <T extends AnyZodSchema>(schema: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return res.status(400).json({
        message: firstIssue?.message ?? "Invalid input",
      });
    }

    req.params = parsed.data as Request["params"];
    return next();
  };

export const validateQuery =
  <T extends AnyZodSchema>(schema: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return res.status(400).json({
        message: firstIssue?.message ?? "Invalid input",
      });
    }

    res.locals.validated = {
      ...res.locals.validated,
      query: parsed.data,
    };
    return next();
  };

export const getValidatedQuery = <T>(req: Request, res: Response): T =>
  (res.locals.validated?.query ?? req.query) as T;
