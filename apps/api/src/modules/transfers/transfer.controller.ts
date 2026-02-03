import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

// Generate a unique transfer code
function generateTransferCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRF-${timestamp}-${random}`;
}

// Create transfer log entry
async function createTransferLog(
  transferId: string,
  action: string,
  userId: string,
  details?: any,
) {
  return prisma.transferLog.create({
    data: {
      transferId,
      action,
      userId,
      details: details || null,
    },
  });
}

class TransferController {
  // Create a new transfer request
  async createTransfer(req: Request, res: Response) {
    try {
      const { fromLocationId, toLocationId, items, notes } = req.body;

      // Validate user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate required fields
      if (!fromLocationId) {
        return res.status(400).json({ message: "Source location is required" });
      }
      if (!toLocationId) {
        return res
          .status(400)
          .json({ message: "Destination location is required" });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one item is required for transfer" });
      }
      if (fromLocationId === toLocationId) {
        return res
          .status(400)
          .json({ message: "Source and destination cannot be the same" });
      }

      // Validate locations exist and are active
      const [fromLocation, toLocation] = await Promise.all([
        prisma.location.findUnique({ where: { id: fromLocationId } }),
        prisma.location.findUnique({ where: { id: toLocationId } }),
      ]);

      if (!fromLocation) {
        return res.status(404).json({ message: "Source location not found" });
      }
      if (!toLocation) {
        return res
          .status(404)
          .json({ message: "Destination location not found" });
      }
      if (!fromLocation.isActive) {
        return res.status(400).json({ message: "Source location is inactive" });
      }
      if (!toLocation.isActive) {
        return res
          .status(400)
          .json({ message: "Destination location is inactive" });
      }

      // Validate items and check stock availability
      const validatedItems: {
        variationId: string;
        subVariationId: string | null;
        quantity: number;
      }[] = [];
      const insufficientStock: any[] = [];

      for (const item of items) {
        if (!item.variationId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({
            message: "Each item must have a variationId and positive quantity",
          });
        }

        const subVariationId =
          (item as { subVariationId?: string | null }).subVariationId ?? null;

        // Check if variation exists
        const variation = await prisma.productVariation.findUnique({
          where: { id: item.variationId },
          include: {
            subVariations: { select: { id: true, name: true } },
            product: {
              select: { id: true, name: true, imsCode: true },
            },
          },
        });

        if (!variation) {
          return res.status(404).json({
            message: `Product variation ${item.variationId} not found`,
          });
        }

        const hasSubVariants = (variation.subVariations?.length ?? 0) > 0;
        if (hasSubVariants && !subVariationId) {
          return res.status(400).json({
            message: `Variation ${variation.color} has sub-variants; specify subVariationId for each item`,
          });
        }
        if (!hasSubVariants && subVariationId) {
          return res.status(400).json({
            message: `Variation ${variation.color} has no sub-variants; do not send subVariationId`,
          });
        }
        if (subVariationId) {
          const belongs = variation.subVariations?.some(
            (s) => s.id === subVariationId,
          );
          if (!belongs) {
            return res.status(400).json({
              message: `Sub-variation ${subVariationId} does not belong to variation ${item.variationId}`,
            });
          }
        }

        // Check stock at source location (variation-level or sub-variant level)
        const sourceInventory = await prisma.locationInventory.findUnique({
          where: {
            locationId_variationId_subVariationId: {
              locationId: fromLocationId,
              variationId: item.variationId,
              subVariationId,
            } as any,
          },
        });

        const availableQuantity = sourceInventory?.quantity || 0;
        if (availableQuantity < item.quantity) {
          insufficientStock.push({
            product: variation.product.name,
            color: variation.color,
            subVariationId: subVariationId ?? undefined,
            requested: item.quantity,
            available: availableQuantity,
          });
        }

        validatedItems.push({
          variationId: item.variationId,
          subVariationId,
          quantity: parseInt(item.quantity),
        });
      }

      // If any items have insufficient stock, return error
      if (insufficientStock.length > 0) {
        return res.status(400).json({
          message: "Insufficient stock for some items",
          insufficientStock,
        });
      }

      // Create transfer with items
      const transfer = await prisma.transfer.create({
        data: {
          transferCode: generateTransferCode(),
          fromLocationId,
          toLocationId,
          status: "PENDING",
          notes: notes || null,
          createdById: req.user.id,
          items: {
            create: validatedItems.map((item) => ({
              variationId: item.variationId,
              subVariationId: item.subVariationId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: {
            select: { id: true, username: true, role: true },
          },
          items: {
            include: {
              variation: {
                include: {
                  product: {
                    select: { id: true, name: true, imsCode: true },
                  },
                },
              },
              subVariation: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Create log entry
      await createTransferLog(transfer.id, "CREATED", req.user.id, {
        fromLocation: fromLocation.name,
        toLocation: toLocation.name,
        itemCount: validatedItems.length,
      });

      // Audit log: CREATE_TRANSFER
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: "CREATE_TRANSFER",
            resource: "transfer",
            resourceId: transfer.id,
            details: {
              transferCode: transfer.transferCode,
              fromLocationId: fromLocationId,
              toLocationId: toLocationId,
            },
            ip:
              (req as any).ip ??
              (req.socket as any)?.remoteAddress ??
              undefined,
            userAgent: req.get("user-agent") ?? undefined,
          },
        });
      } catch (auditErr) {
        console.error("Audit log CREATE_TRANSFER failed:", auditErr);
      }

      res.status(201).json({
        message: "Transfer request created successfully",
        transfer,
      });
    } catch (error: any) {
      console.error("Create transfer error:", error);
      if (error.code === "P2002") {
        // Unique constraint violation, regenerate code and try again
        return res.status(500).json({
          message: "Error creating transfer. Please try again.",
        });
      }
      res
        .status(500)
        .json({ message: "Error creating transfer", error: error.message });
    }
  }

  // Get all transfers with filtering
  async getAllTransfers(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Parse filters
      const status = req.query.status as string | undefined;
      const fromLocationId = req.query.fromLocationId as string | undefined;
      const toLocationId = req.query.toLocationId as string | undefined;
      const locationId = req.query.locationId as string | undefined; // Either from or to

      // Allowed fields for sorting
      const allowedSortFields = [
        "id",
        "transferCode",
        "status",
        "createdAt",
        "approvedAt",
        "completedAt",
      ];

      // Get orderBy for Prisma
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || { createdAt: "desc" };

      // Build filter
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (fromLocationId) {
        where.fromLocationId = fromLocationId;
      }

      if (toLocationId) {
        where.toLocationId = toLocationId;
      }

      if (locationId) {
        where.OR = [
          { fromLocationId: locationId },
          { toLocationId: locationId },
        ];
      }

      if (search) {
        where.OR = [
          ...(where.OR || []),
          { transferCode: { contains: search, mode: "insensitive" } },
          { fromLocation: { name: { contains: search, mode: "insensitive" } } },
          { toLocation: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      const skip = (page - 1) * limit;

      const [totalItems, transfers] = await Promise.all([
        prisma.transfer.count({ where }),
        prisma.transfer.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            fromLocation: {
              select: { id: true, name: true, type: true },
            },
            toLocation: {
              select: { id: true, name: true, type: true },
            },
            createdBy: {
              select: { id: true, username: true },
            },
            approvedBy: {
              select: { id: true, username: true },
            },
            _count: {
              select: { items: true },
            },
          },
        }),
      ]);

      const result = createPaginationResult(transfers, totalItems, page, limit);

      res.status(200).json({
        message: "Transfers fetched successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Get all transfers error:", error);
      res
        .status(500)
        .json({ message: "Error fetching transfers", error: error.message });
    }
  }

  // Get transfer by ID with full details
  async getTransferById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: {
            select: { id: true, username: true, role: true },
          },
          approvedBy: {
            select: { id: true, username: true, role: true },
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
                      category: true,
                    },
                  },
                  photos: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
          logs: {
            include: {
              user: {
                select: { id: true, username: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      res.status(200).json({
        message: "Transfer fetched successfully",
        transfer,
      });
    } catch (error: any) {
      console.error("Get transfer by ID error:", error);
      res
        .status(500)
        .json({ message: "Error fetching transfer", error: error.message });
    }
  }

  // Approve transfer
  async approveTransfer(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              variation: {
                include: {
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.status !== "PENDING") {
        return res.status(400).json({
          message: `Cannot approve transfer with status: ${transfer.status}`,
        });
      }

      // Re-verify stock availability before approval
      const insufficientStock: any[] = [];
      for (const item of transfer.items) {
        const sourceInventory = await prisma.locationInventory.findUnique({
          where: {
            locationId_variationId_subVariationId: {
              locationId: transfer.fromLocationId,
              variationId: item.variationId,
              subVariationId: item.subVariationId,
            } as any,
          },
        });

        const availableQuantity = sourceInventory?.quantity || 0;
        if (availableQuantity < item.quantity) {
          insufficientStock.push({
            product: item.variation.product.name,
            color: item.variation.color,
            subVariationId: item.subVariationId ?? undefined,
            requested: item.quantity,
            available: availableQuantity,
          });
        }
      }

      if (insufficientStock.length > 0) {
        return res.status(400).json({
          message:
            "Cannot approve: Insufficient stock for some items. Stock may have changed since transfer was created.",
          insufficientStock,
        });
      }

      // Update transfer status
      const updatedTransfer = await prisma.transfer.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: req.user.id,
          approvedAt: new Date(),
        },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          items: {
            include: {
              variation: {
                include: {
                  product: { select: { id: true, name: true, imsCode: true } },
                },
              },
              subVariation: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Create log entry
      await createTransferLog(id, "APPROVED", req.user.id);

      res.status(200).json({
        message: "Transfer approved successfully",
        transfer: updatedTransfer,
      });
    } catch (error: any) {
      console.error("Approve transfer error:", error);
      res
        .status(500)
        .json({ message: "Error approving transfer", error: error.message });
    }
  }

  // Start transit - moves status from APPROVED to IN_TRANSIT
  async startTransit(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              variation: {
                include: { product: { select: { name: true } } },
              },
            },
          },
        },
      });

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.status !== "APPROVED") {
        return res.status(400).json({
          message: `Cannot start transit for transfer with status: ${transfer.status}. Transfer must be APPROVED first.`,
        });
      }

      // Deduct stock from source location (variation or sub-variant level)
      for (const item of transfer.items) {
        await prisma.locationInventory.update({
          where: {
            locationId_variationId_subVariationId: {
              locationId: transfer.fromLocationId,
              variationId: item.variationId,
              subVariationId: item.subVariationId,
            } as any,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Update transfer status
      const updatedTransfer = await prisma.transfer.update({
        where: { id },
        data: { status: "IN_TRANSIT" },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          items: {
            include: {
              variation: {
                include: {
                  product: { select: { id: true, name: true, imsCode: true } },
                },
              },
              subVariation: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Create log entry
      await createTransferLog(id, "IN_TRANSIT", req.user.id, {
        message: "Stock deducted from source location",
      });

      res.status(200).json({
        message: "Transfer marked as in transit. Stock deducted from source.",
        transfer: updatedTransfer,
      });
    } catch (error: any) {
      console.error("Start transit error:", error);
      res
        .status(500)
        .json({ message: "Error starting transit", error: error.message });
    }
  }

  // Complete transfer - adds stock to destination
  async completeTransfer(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              variation: {
                include: { product: { select: { name: true } } },
              },
            },
          },
        },
      });

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.status !== "IN_TRANSIT") {
        return res.status(400).json({
          message: `Cannot complete transfer with status: ${transfer.status}. Transfer must be IN_TRANSIT.`,
        });
      }

      // Add stock to destination location (variation or sub-variant level)
      for (const item of transfer.items) {
        await prisma.locationInventory.upsert({
          where: {
            locationId_variationId_subVariationId: {
              locationId: transfer.toLocationId,
              variationId: item.variationId,
              subVariationId: item.subVariationId,
            } as any,
          },
          update: {
            quantity: {
              increment: item.quantity,
            },
          },
          create: {
            locationId: transfer.toLocationId,
            variationId: item.variationId,
            subVariationId: item.subVariationId,
            quantity: item.quantity,
          },
        });
      }

      // Update transfer status
      const updatedTransfer = await prisma.transfer.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          items: {
            include: {
              variation: {
                include: {
                  product: { select: { id: true, name: true, imsCode: true } },
                },
              },
              subVariation: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Create log entry
      await createTransferLog(id, "COMPLETED", req.user.id, {
        message: "Stock added to destination location",
      });

      res.status(200).json({
        message: "Transfer completed successfully. Stock added to destination.",
        transfer: updatedTransfer,
      });
    } catch (error: any) {
      console.error("Complete transfer error:", error);
      res
        .status(500)
        .json({ message: "Error completing transfer", error: error.message });
    }
  }

  // Cancel transfer
  async cancelTransfer(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { reason } = req.body;

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const transfer = await prisma.transfer.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.status === "COMPLETED") {
        return res.status(400).json({
          message: "Cannot cancel a completed transfer",
        });
      }

      if (transfer.status === "CANCELLED") {
        return res.status(400).json({
          message: "Transfer is already cancelled",
        });
      }

      // If transfer was IN_TRANSIT, restore stock to source location
      if (transfer.status === "IN_TRANSIT") {
        for (const item of transfer.items) {
          await prisma.locationInventory.upsert({
            where: {
              locationId_variationId_subVariationId: {
                locationId: transfer.fromLocationId,
                variationId: item.variationId,
                subVariationId: item.subVariationId,
              } as any,
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              locationId: transfer.fromLocationId,
              variationId: item.variationId,
              subVariationId: item.subVariationId,
              quantity: item.quantity,
            },
          });
        }
      }

      // Update transfer status
      const updatedTransfer = await prisma.transfer.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
        },
      });

      // Create log entry
      await createTransferLog(id, "CANCELLED", req.user.id, {
        reason: reason || "No reason provided",
        previousStatus: transfer.status,
        stockRestored: transfer.status === "IN_TRANSIT",
      });

      res.status(200).json({
        message: `Transfer cancelled successfully${transfer.status === "IN_TRANSIT" ? ". Stock restored to source location." : "."}`,
        transfer: updatedTransfer,
      });
    } catch (error: any) {
      console.error("Cancel transfer error:", error);
      res
        .status(500)
        .json({ message: "Error cancelling transfer", error: error.message });
    }
  }

  // Get transfer logs for a specific transfer
  async getTransferLogs(req: Request, res: Response) {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const transfer = await prisma.transfer.findUnique({
        where: { id: transferId },
      });

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      const logs = await prisma.transferLog.findMany({
        where: { transferId },
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({
        message: "Transfer logs fetched successfully",
        transferCode: transfer.transferCode,
        logs,
      });
    } catch (error: any) {
      console.error("Get transfer logs error:", error);
      res.status(500).json({
        message: "Error fetching transfer logs",
        error: error.message,
      });
    }
  }
}

export default new TransferController();
