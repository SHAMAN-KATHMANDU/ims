import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

class MemberController {
  // Create a new member
  async createMember(req: Request, res: Response) {
    try {
      const { phone, name, email, notes } = req.body;

      // Validate required fields
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Normalize phone number (remove spaces, dashes)
      const normalizedPhone = phone.replace(/[\s-]/g, "").trim();

      // Check if member already exists
      const existingMember = await prisma.member.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingMember) {
        return res.status(409).json({
          message: "Member with this phone number already exists",
          member: existingMember,
        });
      }

      const member = await prisma.member.create({
        data: {
          phone: normalizedPhone,
          name: name || null,
          email: email || null,
          notes: notes || null,
        },
      });

      res.status(201).json({
        message: "Member created successfully",
        member,
      });
    } catch (error: any) {
      console.error("Create member error:", error);
      res
        .status(500)
        .json({ message: "Error creating member", error: error.message });
    }
  }

  // Get all members with pagination and search
  async getAllMembers(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Allowed fields for sorting
      const allowedSortFields = [
        "id",
        "phone",
        "name",
        "createdAt",
        "updatedAt",
      ];

      // Get orderBy for Prisma
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      // Build search filter
      const where: any = {};
      if (search) {
        where.OR = [
          { phone: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Get total count and members in parallel
      const [totalItems, members] = await Promise.all([
        prisma.member.count({ where }),
        prisma.member.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: { sales: true },
            },
          },
        }),
      ]);

      const result = createPaginationResult(members, totalItems, page, limit);

      res.status(200).json({
        message: "Members fetched successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Get all members error:", error);
      res
        .status(500)
        .json({ message: "Error fetching members", error: error.message });
    }
  }

  // Get member by phone number
  async getMemberByPhone(req: Request, res: Response) {
    try {
      const phone = Array.isArray(req.params.phone)
        ? req.params.phone[0]
        : req.params.phone;

      // Normalize phone number
      const normalizedPhone = phone.replace(/[\s-]/g, "").trim();

      const member = await prisma.member.findUnique({
        where: { phone: normalizedPhone },
        include: {
          _count: {
            select: { sales: true },
          },
        },
      });

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.status(200).json({
        message: "Member fetched successfully",
        member,
      });
    } catch (error: any) {
      console.error("Get member by phone error:", error);
      res
        .status(500)
        .json({ message: "Error fetching member", error: error.message });
    }
  }

  // Get member by ID
  async getMemberById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          sales: {
            orderBy: { createdAt: "desc" },
            include: {
              location: {
                select: { id: true, name: true },
              },
              items: {
                include: {
                  variation: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          name: true,
                          imsCode: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: { sales: true },
          },
        },
      });

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.status(200).json({
        message: "Member fetched successfully",
        member,
      });
    } catch (error: any) {
      console.error("Get member by ID error:", error);
      res
        .status(500)
        .json({ message: "Error fetching member", error: error.message });
    }
  }

  // Update member
  async updateMember(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { phone, name, email, notes, isActive } = req.body;

      // Check if member exists
      const existingMember = await prisma.member.findUnique({
        where: { id },
      });

      if (!existingMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Prepare update data
      const updateData: any = {};

      if (phone !== undefined) {
        const normalizedPhone = phone.replace(/[\s-]/g, "").trim();
        // Check if new phone is already taken by another member
        if (normalizedPhone !== existingMember.phone) {
          const phoneExists = await prisma.member.findUnique({
            where: { phone: normalizedPhone },
          });

          if (phoneExists) {
            return res.status(409).json({
              message: "Phone number already taken by another member",
            });
          }
        }
        updateData.phone = normalizedPhone;
      }

      if (name !== undefined) {
        updateData.name = name || null;
      }

      if (email !== undefined) {
        updateData.email = email || null;
      }

      if (notes !== undefined) {
        updateData.notes = notes || null;
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      const updatedMember = await prisma.member.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: { sales: true },
          },
        },
      });

      res.status(200).json({
        message: "Member updated successfully",
        member: updatedMember,
      });
    } catch (error: any) {
      console.error("Update member error:", error);
      res
        .status(500)
        .json({ message: "Error updating member", error: error.message });
    }
  }

  // Check if phone number is a member (quick lookup for sales)
  async checkMember(req: Request, res: Response) {
    try {
      const phone = Array.isArray(req.params.phone)
        ? req.params.phone[0]
        : req.params.phone;

      // Normalize phone number
      const normalizedPhone = phone.replace(/[\s-]/g, "").trim();

      const member = await prisma.member.findUnique({
        where: { phone: normalizedPhone },
        select: {
          id: true,
          phone: true,
          name: true,
          isActive: true,
        },
      });

      res.status(200).json({
        isMember: !!member && member.isActive,
        member: member || null,
      });
    } catch (error: any) {
      console.error("Check member error:", error);
      res
        .status(500)
        .json({ message: "Error checking member", error: error.message });
    }
  }
}

export default new MemberController();
