import { createError } from "@/middlewares/errorHandler";
import attributeTypeRepository, {
  type AttributeTypeRepository,
} from "./attribute-type.repository";
import type {
  CreateAttributeTypeDto,
  UpdateAttributeTypeDto,
  CreateAttributeValueDto,
  UpdateAttributeValueDto,
} from "./attribute-type.schema";

function deriveCode(name: string, code?: string): string {
  const raw = (code ?? name).toString().trim();
  return raw.toLowerCase().replace(/\s+/g, "_");
}

export class AttributeTypeService {
  constructor(private repo: AttributeTypeRepository) {}

  async list(tenantId: string) {
    return this.repo.findMany(tenantId);
  }

  async create(tenantId: string, data: CreateAttributeTypeDto) {
    const code = deriveCode(data.name, data.code);
    if (!code) {
      throw createError(
        "Code is required (derived from name if not provided)",
        400,
      );
    }

    const existing = await this.repo.findByCode(tenantId, code);
    if (existing) {
      const err = createError(
        "An attribute type with this code already exists",
        409,
      );
      (err as unknown as Record<string, unknown>).code = code;
      throw err;
    }

    return this.repo.create({
      tenantId,
      name: data.name.trim(),
      code,
      displayOrder: data.displayOrder ?? 0,
    });
  }

  async getById(id: string, tenantId: string) {
    const attributeType = await this.repo.findFirst(tenantId, id);
    if (!attributeType) {
      throw createError("Attribute type not found", 404);
    }
    return attributeType;
  }

  async update(id: string, tenantId: string, data: UpdateAttributeTypeDto) {
    const existing = await this.repo.findFirst(tenantId, id);
    if (!existing) {
      throw createError("Attribute type not found", 404);
    }

    const codeVal =
      data.code !== undefined
        ? data.code.toString().trim().toLowerCase().replace(/\s+/g, "_")
        : undefined;

    if (codeVal !== undefined && codeVal !== existing.code) {
      const duplicate = await this.repo.findByCodeExcluding(
        tenantId,
        codeVal,
        id,
      );
      if (duplicate) {
        throw createError(
          "Another attribute type with this code already exists",
          409,
        );
      }
    }

    const updateData: Parameters<typeof this.repo.update>[1] = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (codeVal !== undefined) updateData.code = codeVal;
    if (data.displayOrder !== undefined) {
      updateData.displayOrder = data.displayOrder;
    }

    return this.repo.update(id, updateData);
  }

  async delete(id: string, tenantId: string) {
    const existing = await this.repo.findFirst(tenantId, id);
    if (!existing) {
      throw createError("Attribute type not found", 404);
    }
    await this.repo.delete(id);
  }

  async listValues(typeId: string, tenantId: string) {
    const attributeType = await this.repo.findFirstWithValuesOnly(
      tenantId,
      typeId,
    );
    if (!attributeType) {
      throw createError("Attribute type not found", 404);
    }
    return attributeType.values;
  }

  async createValue(
    typeId: string,
    tenantId: string,
    data: CreateAttributeValueDto,
  ) {
    const attributeType = await this.repo.findFirst(tenantId, typeId);
    if (!attributeType) {
      throw createError("Attribute type not found", 404);
    }

    const trimmedValue = data.value.trim();
    const existing = await this.repo.findValueByTypeAndValue(
      typeId,
      trimmedValue,
    );
    if (existing) {
      const err = createError(
        "This value already exists for this attribute type",
        409,
      );
      (err as unknown as Record<string, unknown>).value = trimmedValue;
      throw err;
    }

    return this.repo.createValue({
      attributeTypeId: typeId,
      value: trimmedValue,
      code: data.code?.toString().trim() || null,
      displayOrder: data.displayOrder ?? 0,
    });
  }

  async updateValue(
    typeId: string,
    valueId: string,
    tenantId: string,
    data: UpdateAttributeValueDto,
  ) {
    const attributeType = await this.repo.findFirst(tenantId, typeId);
    if (!attributeType) {
      throw createError("Attribute type not found", 404);
    }

    const existingValue = await this.repo.findValueById(typeId, valueId);
    if (!existingValue) {
      throw createError("Attribute value not found", 404);
    }

    if (data.value !== undefined && data.value.trim() !== existingValue.value) {
      const duplicate = await this.repo.findValueByTypeAndValueExcluding(
        typeId,
        data.value.trim(),
        valueId,
      );
      if (duplicate) {
        throw createError(
          "This value already exists for this attribute type",
          409,
        );
      }
    }

    const updateData: Parameters<typeof this.repo.updateValue>[1] = {};
    if (data.value !== undefined) updateData.value = data.value.trim();
    if (data.code !== undefined) {
      updateData.code = data.code?.toString().trim() || null;
    }
    if (data.displayOrder !== undefined) {
      updateData.displayOrder = data.displayOrder;
    }

    return this.repo.updateValue(valueId, updateData);
  }

  async deleteValue(typeId: string, valueId: string, tenantId: string) {
    const attributeType = await this.repo.findFirst(tenantId, typeId);
    if (!attributeType) {
      throw createError("Attribute type not found", 404);
    }

    const existingValue = await this.repo.findValueById(typeId, valueId);
    if (!existingValue) {
      throw createError("Attribute value not found", 404);
    }

    await this.repo.deleteValue(valueId);
  }
}

export default new AttributeTypeService(attributeTypeRepository);
