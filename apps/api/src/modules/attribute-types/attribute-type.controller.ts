import { Request, Response } from "express";
import prisma from "@/config/prisma";
import { sendControllerError } from "@/utils/controllerError";

class AttributeTypeController {
  /** List all attribute types for the tenant */
  async list(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const types = await prisma.attributeType.findMany({
        where: { tenantId },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: {
          values: {
            orderBy: [{ displayOrder: "asc" }, { value: "asc" }],
          },
        },
      });
      return res.status(200).json({
        message: "Attribute types fetched successfully",
        attributeTypes: types,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List attribute types error");
    }
  }

  /** Create an attribute type */
  async create(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { name, code, displayOrder } = req.body as {
        name?: string;
        code?: string;
        displayOrder?: number;
      };

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const codeVal = (code ?? name)
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      if (!codeVal) {
        return res.status(400).json({
          message: "Code is required (derived from name if not provided)",
        });
      }

      const existing = await prisma.attributeType.findFirst({
        where: { tenantId, code: codeVal },
      });
      if (existing) {
        return res.status(409).json({
          message: "An attribute type with this code already exists",
          code: codeVal,
        });
      }

      const attributeType = await prisma.attributeType.create({
        data: {
          tenantId,
          name: name.trim(),
          code: codeVal,
          displayOrder: Number(displayOrder) || 0,
        },
        include: { values: true },
      });

      return res.status(201).json({
        message: "Attribute type created successfully",
        attributeType,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "An attribute type with this code already exists",
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Create attribute type error",
      );
    }
  }

  /** Get one attribute type by id */
  async getById(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!id) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }

      const attributeType = await prisma.attributeType.findFirst({
        where: { id, tenantId },
        include: {
          values: { orderBy: [{ displayOrder: "asc" }, { value: "asc" }] },
        },
      });

      if (!attributeType) {
        return res.status(404).json({ message: "Attribute type not found" });
      }

      return res.status(200).json({
        message: "Attribute type fetched successfully",
        attributeType,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get attribute type error");
    }
  }

  /** Update an attribute type */
  async update(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { name, code, displayOrder } = req.body as {
        name?: string;
        code?: string;
        displayOrder?: number;
      };

      if (!id) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }

      const existing = await prisma.attributeType.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return res.status(404).json({ message: "Attribute type not found" });
      }

      const codeVal =
        code !== undefined
          ? code.toString().trim().toLowerCase().replace(/\s+/g, "_")
          : undefined;
      if (codeVal !== undefined && codeVal !== existing.code) {
        const duplicate = await prisma.attributeType.findFirst({
          where: { tenantId, code: codeVal },
        });
        if (duplicate) {
          return res.status(409).json({
            message: "Another attribute type with this code already exists",
          });
        }
      }

      const attributeType = await prisma.attributeType.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(codeVal !== undefined && { code: codeVal }),
          ...(displayOrder !== undefined && {
            displayOrder: Number(displayOrder) ?? 0,
          }),
        },
        include: { values: true },
      });

      return res.status(200).json({
        message: "Attribute type updated successfully",
        attributeType,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "Another attribute type with this code already exists",
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update attribute type error",
      );
    }
  }

  /** Delete an attribute type (cascades to values and variation attributes) */
  async delete(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!id) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }

      const existing = await prisma.attributeType.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return res.status(404).json({ message: "Attribute type not found" });
      }

      await prisma.attributeType.delete({ where: { id } });

      return res.status(200).json({
        message: "Attribute type deleted successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Delete attribute type error",
      );
    }
  }

  // ---------- Attribute values (nested under type) ----------

  /** List values for an attribute type */
  async listValues(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const typeId = Array.isArray(req.params.typeId)
        ? req.params.typeId[0]
        : req.params.typeId;
      if (!typeId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }

      const attributeType = await prisma.attributeType.findFirst({
        where: { id: typeId, tenantId },
        include: {
          values: { orderBy: [{ displayOrder: "asc" }, { value: "asc" }] },
        },
      });
      if (!attributeType) {
        return res.status(404).json({ message: "Attribute type not found" });
      }

      return res.status(200).json({
        message: "Attribute values fetched successfully",
        attributeType: attributeType.id,
        values: attributeType.values,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "List attribute values error",
      );
    }
  }

  /** Create an attribute value for a type */
  async createValue(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const typeId = Array.isArray(req.params.typeId)
        ? req.params.typeId[0]
        : req.params.typeId;
      const { value, code, displayOrder } = req.body as {
        value?: string;
        code?: string;
        displayOrder?: number;
      };

      if (!typeId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }
      if (!value || !value.trim()) {
        return res.status(400).json({ message: "Value is required" });
      }

      const attributeType = await prisma.attributeType.findFirst({
        where: { id: typeId, tenantId },
      });
      if (!attributeType) {
        return res.status(404).json({ message: "Attribute type not found" });
      }

      const existing = await prisma.attributeValue.findFirst({
        where: { attributeTypeId: typeId, value: value.trim() },
      });
      if (existing) {
        return res.status(409).json({
          message: "This value already exists for this attribute type",
          value: value.trim(),
        });
      }

      const attributeValue = await prisma.attributeValue.create({
        data: {
          attributeTypeId: typeId,
          value: value.trim(),
          code: code?.toString().trim() || null,
          displayOrder: Number(displayOrder) || 0,
        },
      });

      return res.status(201).json({
        message: "Attribute value created successfully",
        attributeValue,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "This value already exists for this attribute type",
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Create attribute value error",
      );
    }
  }

  /** Update an attribute value */
  async updateValue(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const typeId = Array.isArray(req.params.typeId)
        ? req.params.typeId[0]
        : req.params.typeId;
      const valueId = Array.isArray(req.params.valueId)
        ? req.params.valueId[0]
        : req.params.valueId;
      const { value, code, displayOrder } = req.body as {
        value?: string;
        code?: string;
        displayOrder?: number;
      };

      if (!typeId || !valueId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID and value ID are required" });
      }

      const attributeType = await prisma.attributeType.findFirst({
        where: { id: typeId, tenantId },
      });
      if (!attributeType) {
        return res.status(404).json({ message: "Attribute type not found" });
      }

      const existingValue = await prisma.attributeValue.findFirst({
        where: { id: valueId, attributeTypeId: typeId },
      });
      if (!existingValue) {
        return res.status(404).json({ message: "Attribute value not found" });
      }

      if (value !== undefined && value.trim() !== existingValue.value) {
        const duplicate = await prisma.attributeValue.findFirst({
          where: { attributeTypeId: typeId, value: value.trim() },
        });
        if (duplicate) {
          return res.status(409).json({
            message: "This value already exists for this attribute type",
          });
        }
      }

      const attributeValue = await prisma.attributeValue.update({
        where: { id: valueId },
        data: {
          ...(value !== undefined && { value: value.trim() }),
          ...(code !== undefined && { code: code.toString().trim() || null }),
          ...(displayOrder !== undefined && {
            displayOrder: Number(displayOrder) ?? 0,
          }),
        },
      });

      return res.status(200).json({
        message: "Attribute value updated successfully",
        attributeValue,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message: "This value already exists for this attribute type",
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update attribute value error",
      );
    }
  }

  /** Delete an attribute value */
  async deleteValue(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const typeId = Array.isArray(req.params.typeId)
        ? req.params.typeId[0]
        : req.params.typeId;
      const valueId = Array.isArray(req.params.valueId)
        ? req.params.valueId[0]
        : req.params.valueId;

      if (!typeId || !valueId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID and value ID are required" });
      }

      const attributeType = await prisma.attributeType.findFirst({
        where: { id: typeId, tenantId },
      });
      if (!attributeType) {
        return res.status(404).json({ message: "Attribute type not found" });
      }

      const existingValue = await prisma.attributeValue.findFirst({
        where: { id: valueId, attributeTypeId: typeId },
      });
      if (!existingValue) {
        return res.status(404).json({ message: "Attribute value not found" });
      }

      await prisma.attributeValue.delete({ where: { id: valueId } });

      return res.status(200).json({
        message: "Attribute value deleted successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Delete attribute value error",
      );
    }
  }
}

const attributeTypeController = new AttributeTypeController();
export default attributeTypeController;
