import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import { usersService } from "./users.service";

class UserController {
  async createUser(req: Request, res: Response) {
    const auth = req.authContext!;

    const { username, password, role } = req.body;
    const user = await usersService.create(auth.tenantId, {
      username,
      password,
      role,
    });
    const normalizedUsername =
      username?.toLowerCase?.()?.trim() ?? user.username;
    return ok(
      res,
      { user },
      201,
      `User created successfully with username ${normalizedUsername}`,
    );
  }

  async getAllUsers(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: "id" | "username" | "role" | "createdAt" | "updatedAt";
      sortOrder?: "asc" | "desc";
    }>(req, res);

    const result = await usersService.getAll(auth.tenantId, query);
    return okPaginated(
      res,
      result.data,
      result.pagination,
      "Users fetched successfully",
    );
  }

  async getUserById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const user = await usersService.getById(id, auth.tenantId);
    return ok(res, { user }, 200, "User fetched successfully");
  }

  async updateUser(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const { username, password, role } = req.body;
    const user = await usersService.update(id, auth.tenantId, {
      username,
      password,
      role,
    });
    return ok(res, { user }, 200, "User updated successfully");
  }

  async deleteUser(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    await usersService.delete(id, auth.tenantId, auth.userId);
    return ok(res, undefined, 200, "User deleted successfully");
  }
}

export default new UserController();
