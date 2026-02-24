import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import { trashService } from "./trash.service";

async function listTrash(req: Request, res: Response) {
  const auth = req.authContext!;

  const query = getValidatedQuery<{
    page?: number;
    limit?: number;
    entityType?: string;
  }>(req, res);

  const result = await trashService.list(auth.tenantId, query);
  return okPaginated(
    res,
    result.data,
    result.pagination,
    "Trash items retrieved",
  );
}

async function restoreItem(req: Request, res: Response) {
  const auth = req.authContext!;

  const { entityType, id } = req.params as { entityType: string; id: string };
  const { type } = await trashService.restore(entityType, id, auth.tenantId);
  return ok(res, undefined, 200, `${type} restored successfully`);
}

async function permanentlyDeleteItem(req: Request, res: Response) {
  const auth = req.authContext!;

  const { entityType, id } = req.params as { entityType: string; id: string };
  const { type } = await trashService.permanentlyDelete(
    entityType,
    id,
    auth.tenantId,
  );
  return ok(res, undefined, 200, `${type} permanently deleted`);
}

const trashController = {
  listTrash,
  restoreItem,
  permanentlyDeleteItem,
};

export default trashController;
