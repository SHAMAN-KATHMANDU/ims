import bcrypt from "bcryptjs";
import { Prisma, type Role } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import userRepository, { UserRepository } from "./user.repository";
import passwordResetRepository from "./password-reset.repository";
import type {
  CreateUserDto,
  UpdateUserDto,
  ApprovePasswordResetDto,
} from "./user.schema";

const BCRYPT_ROUNDS = 10;

export class UserService {
  constructor(private repo: UserRepository) {}

  async create(tenantId: string, data: CreateUserDto) {
    const existing = await this.repo.findByUsername(data.username);
    if (existing) {
      throw createError("User with this username already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    return this.repo.create(tenantId, { ...data, hashedPassword });
  }

  async findAll(rawQuery: Record<string, unknown>) {
    const query = getPaginationParams(rawQuery);
    const validRoles: Role[] = ["platformAdmin", "superAdmin", "admin", "user"];
    const role =
      typeof rawQuery.role === "string" &&
      validRoles.includes(rawQuery.role as Role)
        ? (rawQuery.role as Role)
        : undefined;
    return this.repo.findAll({ ...query, role });
  }

  async findById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw createError("User not found", 404);
    return user;
  }

  async update(id: string, requestingUserId: string, data: UpdateUserDto) {
    const existing = await this.repo.findByIdRaw(id);
    if (!existing) throw createError("User not found", 404);

    const updateData: { username?: string; password?: string; role?: Role } =
      {};

    if (data.username !== undefined) {
      const conflict = await this.repo.findByUsernameExcluding(
        data.username,
        id,
      );
      if (conflict) throw createError("Username already taken", 409);
      updateData.username = data.username;
    }

    if (data.password !== undefined) {
      updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    if (data.role !== undefined) {
      updateData.role = data.role as Role;
    }

    return this.repo.update(id, updateData);
  }

  async delete(id: string, requestingUserId: string) {
    const existing = await this.repo.findByIdRaw(id);
    if (!existing) throw createError("User not found", 404);

    if (requestingUserId === id) {
      throw createError("You cannot delete your own account", 400);
    }

    if (existing.role === "platformAdmin") {
      throw createError("Cannot delete the platform admin.", 403);
    }

    try {
      await this.repo.delete(id);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw createError(
          "This user cannot be deleted while they are linked to CRM contacts or other records. Reassign or remove those links first, then try again.",
          409,
        );
      }
      throw error;
    }
  }

  async getPasswordResetRequests(
    tenantId: string,
    query?: { page?: number; limit?: number; search?: string },
  ) {
    const page = query?.page;
    const limit = query?.limit;
    const search = query?.search;
    const usePagination =
      page != null && limit != null && page > 0 && limit > 0;
    if (!usePagination) {
      const requests = await passwordResetRepository.findForTenant(tenantId);
      return { requests };
    }
    const [requests, totalItems] = await Promise.all([
      passwordResetRepository.findForTenantPaginated(
        tenantId,
        (page - 1) * limit,
        limit,
        search,
      ),
      passwordResetRepository.countForTenant(tenantId, search),
    ]);
    const result = createPaginationResult(requests, totalItems, page, limit);
    return { requests: result.data, pagination: result.pagination };
  }

  async approveResetRequest(
    requestId: string,
    tenantId: string,
    handledById: string,
    data: ApprovePasswordResetDto,
  ) {
    const req = await passwordResetRepository.findById(requestId);
    if (!req) throw createError("Password reset request not found", 404);
    if (req.tenantId !== tenantId)
      throw createError("Request does not belong to your organization", 403);
    if (req.status === "ESCALATED")
      throw createError(
        "Escalated requests must be handled by platform admin",
        403,
      );
    if (req.status !== "PENDING")
      throw createError("Request has already been handled", 400);

    const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
    await passwordResetRepository.approve(
      requestId,
      handledById,
      hashedPassword,
    );
  }

  async escalateResetRequest(requestId: string, tenantId: string) {
    const req = await passwordResetRepository.findById(requestId);
    if (!req) throw createError("Password reset request not found", 404);
    if (req.tenantId !== tenantId)
      throw createError("Request does not belong to your organization", 403);
    if (req.status === "ESCALATED")
      throw createError("Request is already escalated", 400);
    if (req.status !== "PENDING")
      throw createError("Request has already been handled", 400);

    return passwordResetRepository.escalate(requestId);
  }

  async rejectResetRequest(
    requestId: string,
    tenantId: string,
    handledById: string,
  ) {
    const req = await passwordResetRepository.findById(requestId);
    if (!req) throw createError("Password reset request not found", 404);
    if (req.tenantId !== tenantId)
      throw createError("Request does not belong to your organization", 403);
    if (req.status !== "PENDING")
      throw createError("Request has already been handled", 400);

    return passwordResetRepository.reject(requestId, handledById);
  }
}

export default new UserService(userRepository);
