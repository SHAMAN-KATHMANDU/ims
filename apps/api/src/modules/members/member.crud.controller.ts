/**
 * Member CRUD controller — create, list, get, update, check.
 */
import { Request, Response } from "express";
import { getPaginationParams } from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated } from "@/shared/response";
import { membersService } from "./members.service";

async function createMember(req: Request, res: Response) {
  const auth = req.authContext!;
  const { phone, name, email, notes } = req.body;
  const member = await membersService.create(auth.tenantId, {
    phone,
    name,
    email,
    notes,
  });
  return ok(res, { member }, 201, "Member created successfully");
}

async function getAllMembers(req: Request, res: Response) {
  const auth = req.authContext!;
  const query = getValidatedQuery<{
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: "createdAt" | "updatedAt" | "name" | "id";
    sortOrder?: "asc" | "desc";
  }>(req, res);

  const result = await membersService.getAll(auth.tenantId, query);
  return okPaginated(
    res,
    result.data,
    result.pagination,
    "Members fetched successfully",
  );
}

async function getMemberByPhone(req: Request, res: Response) {
  const auth = req.authContext!;
  const { phone } = req.params as { phone: string };
  const member = await membersService.getByPhone(auth.tenantId, phone);
  return ok(res, { member }, 200, "Member fetched successfully");
}

async function getMemberById(req: Request, res: Response) {
  const auth = req.authContext!;
  const { id } = req.params as { id: string };
  const member = await membersService.getById(id, auth.tenantId);
  return ok(res, { member }, 200, "Member fetched successfully");
}

async function updateMember(req: Request, res: Response) {
  const auth = req.authContext!;
  const { id } = req.params as { id: string };
  const { phone, name, email, notes, isActive } = req.body;
  const member = await membersService.update(id, auth.tenantId, {
    phone,
    name,
    email,
    notes,
    isActive,
  });
  return ok(res, { member }, 200, "Member updated successfully");
}

async function checkMember(req: Request, res: Response) {
  const auth = req.authContext!;
  const { phone } = req.params as { phone: string };
  const result = await membersService.checkMember(auth.tenantId, phone);
  return ok(res, result);
}

export default {
  createMember,
  getAllMembers,
  getMemberByPhone,
  getMemberById,
  updateMember,
  checkMember,
};
