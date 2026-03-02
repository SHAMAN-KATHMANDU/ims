import { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "@/middlewares/errorHandler";
import { sendControllerError } from "@/utils/controllerError";
import {
  CreateAttributeTypeSchema,
  UpdateAttributeTypeSchema,
  CreateAttributeValueSchema,
  UpdateAttributeValueSchema,
} from "./attribute-type.schema";
import attributeTypeService, {
  AttributeTypeService,
} from "./attribute-type.service";

function parseId(req: Request, param: "id" | "typeId" | "valueId"): string {
  const raw = req.params[param];
  return Array.isArray(raw) ? raw[0] : raw;
}

class AttributeTypeController {
  constructor(private service: AttributeTypeService) {}

  list = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const types = await this.service.list(tenantId);
      return res.status(200).json({
        message: "Attribute types fetched successfully",
        attributeTypes: types,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List attribute types error");
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateAttributeTypeSchema.parse(req.body);
      const attributeType = await this.service.create(tenantId, body);
      return res.status(201).json({
        message: "Attribute type created successfully",
        attributeType,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 409) {
        return res.status(409).json({
          message: appErr.message,
          code: (error as AppError & { code?: string }).code,
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Create attribute type error",
      );
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = parseId(req, "id");
      if (!id) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }
      const tenantId = req.user!.tenantId;
      const attributeType = await this.service.getById(id, tenantId);
      return res.status(200).json({
        message: "Attribute type fetched successfully",
        attributeType,
      });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get attribute type error");
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseId(req, "id");
      if (!id) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }
      const tenantId = req.user!.tenantId;
      const body = UpdateAttributeTypeSchema.parse(req.body);
      const attributeType = await this.service.update(id, tenantId, body);
      return res.status(200).json({
        message: "Attribute type updated successfully",
        attributeType,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      if ((error as AppError).statusCode === 409) {
        return res.status(409).json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update attribute type error",
      );
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = parseId(req, "id");
      if (!id) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }
      const tenantId = req.user!.tenantId;
      await this.service.delete(id, tenantId);
      return res.status(200).json({
        message: "Attribute type deleted successfully",
      });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Delete attribute type error",
      );
    }
  };

  listValues = async (req: Request, res: Response) => {
    try {
      const typeId = parseId(req, "typeId");
      if (!typeId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }
      const tenantId = req.user!.tenantId;
      const values = await this.service.listValues(typeId, tenantId);
      return res.status(200).json({
        message: "Attribute values fetched successfully",
        attributeType: typeId,
        values,
      });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "List attribute values error",
      );
    }
  };

  createValue = async (req: Request, res: Response) => {
    try {
      const typeId = parseId(req, "typeId");
      if (!typeId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID is required" });
      }
      const tenantId = req.user!.tenantId;
      const body = CreateAttributeValueSchema.parse(req.body);
      const attributeValue = await this.service.createValue(
        typeId,
        tenantId,
        body,
      );
      return res.status(201).json({
        message: "Attribute value created successfully",
        attributeValue,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      if ((error as AppError).statusCode === 409) {
        return res.status(409).json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Create attribute value error",
      );
    }
  };

  updateValue = async (req: Request, res: Response) => {
    try {
      const typeId = parseId(req, "typeId");
      const valueId = parseId(req, "valueId");
      if (!typeId || !valueId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID and value ID are required" });
      }
      const tenantId = req.user!.tenantId;
      const body = UpdateAttributeValueSchema.parse(req.body);
      const attributeValue = await this.service.updateValue(
        typeId,
        valueId,
        tenantId,
        body,
      );
      return res.status(200).json({
        message: "Attribute value updated successfully",
        attributeValue,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      if ((error as AppError).statusCode === 409) {
        return res.status(409).json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update attribute value error",
      );
    }
  };

  deleteValue = async (req: Request, res: Response) => {
    try {
      const typeId = parseId(req, "typeId");
      const valueId = parseId(req, "valueId");
      if (!typeId || !valueId) {
        return res
          .status(400)
          .json({ message: "Attribute type ID and value ID are required" });
      }
      const tenantId = req.user!.tenantId;
      await this.service.deleteValue(typeId, valueId, tenantId);
      return res.status(200).json({
        message: "Attribute value deleted successfully",
      });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Delete attribute value error",
      );
    }
  };
}

const attributeTypeController = new AttributeTypeController(
  attributeTypeService,
);
export default attributeTypeController;
