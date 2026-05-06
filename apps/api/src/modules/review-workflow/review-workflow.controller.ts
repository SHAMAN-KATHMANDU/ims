/**
 * Review-workflow controller — Phase 6.
 *
 * Three endpoints per record-type, mounted on the existing /blog and
 * /pages routers (we don't introduce a new top-level path so the routes
 * sit alongside the existing publish/unpublish actions).
 */

import { Request, Response } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  reviewWorkflowService,
  type ContentRecordType,
} from "./review-workflow.service";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function handleAppError(res: Response, error: unknown): Response | null {
  const err = error as AppError;
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return null;
}

function buildHandler(
  action: (args: {
    tenantId: string;
    userId: string;
    recordType: ContentRecordType;
    recordId: string;
  }) => Promise<{ id: string; reviewStatus: string }>,
  successMsg: string,
  errLabel: string,
  recordType: ContentRecordType,
) {
  return async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const recordId = getParam(req, "id");
      const result = await action({ tenantId, userId, recordType, recordId });
      return res.status(200).json({ message: successMsg, ...result });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, errLabel)
      );
    }
  };
}

class ReviewWorkflowController {
  // Blog post handlers
  blogRequestReview = buildHandler(
    reviewWorkflowService.requestReview,
    "Review requested",
    "Request blog review error",
    "BLOG_POST",
  );
  blogApprove = buildHandler(
    reviewWorkflowService.approve,
    "Approved",
    "Approve blog post error",
    "BLOG_POST",
  );
  blogReject = buildHandler(
    reviewWorkflowService.reject,
    "Sent back to draft",
    "Reject blog post error",
    "BLOG_POST",
  );

  // Tenant page handlers
  pageRequestReview = buildHandler(
    reviewWorkflowService.requestReview,
    "Review requested",
    "Request page review error",
    "TENANT_PAGE",
  );
  pageApprove = buildHandler(
    reviewWorkflowService.approve,
    "Approved",
    "Approve page error",
    "TENANT_PAGE",
  );
  pageReject = buildHandler(
    reviewWorkflowService.reject,
    "Sent back to draft",
    "Reject page error",
    "TENANT_PAGE",
  );
}

export default new ReviewWorkflowController();
