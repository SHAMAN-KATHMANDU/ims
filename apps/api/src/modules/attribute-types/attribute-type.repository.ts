import prisma from "@/config/prisma";

const attributeTypeInclude = {
  values: {
    orderBy: [{ displayOrder: "asc" as const }, { value: "asc" as const }],
  },
};

const valuesOrderBy = [
  { displayOrder: "asc" as const },
  { value: "asc" as const },
];

export interface CreateAttributeTypeData {
  tenantId: string;
  name: string;
  code: string;
  displayOrder: number;
}

export interface UpdateAttributeTypeData {
  name?: string;
  code?: string;
  displayOrder?: number;
}

export interface CreateAttributeValueData {
  attributeTypeId: string;
  value: string;
  code: string | null;
  displayOrder: number;
}

export interface UpdateAttributeValueData {
  value?: string;
  code?: string | null;
  displayOrder?: number;
}

export class AttributeTypeRepository {
  async findMany(tenantId: string) {
    return prisma.attributeType.findMany({
      where: { tenantId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: attributeTypeInclude,
    });
  }

  async findFirst(tenantId: string, id: string) {
    return prisma.attributeType.findFirst({
      where: { id, tenantId },
      include: attributeTypeInclude,
    });
  }

  async findFirstWithValuesOnly(tenantId: string, id: string) {
    return prisma.attributeType.findFirst({
      where: { id, tenantId },
      include: {
        values: { orderBy: valuesOrderBy },
      },
    });
  }

  async findByCode(tenantId: string, code: string) {
    return prisma.attributeType.findFirst({
      where: { tenantId, code },
    });
  }

  async findByCodeExcluding(tenantId: string, code: string, excludeId: string) {
    return prisma.attributeType.findFirst({
      where: { tenantId, code, id: { not: excludeId } },
    });
  }

  async create(data: CreateAttributeTypeData) {
    return prisma.attributeType.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        code: data.code,
        displayOrder: data.displayOrder,
      },
      include: { values: true },
    });
  }

  async update(id: string, data: UpdateAttributeTypeData) {
    return prisma.attributeType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.displayOrder !== undefined && {
          displayOrder: data.displayOrder,
        }),
      },
      include: { values: true },
    });
  }

  async delete(id: string) {
    return prisma.attributeType.delete({ where: { id } });
  }

  // Attribute values
  async findValueByTypeAndValue(attributeTypeId: string, value: string) {
    return prisma.attributeValue.findFirst({
      where: { attributeTypeId, value },
    });
  }

  async findValueById(attributeTypeId: string, valueId: string) {
    return prisma.attributeValue.findFirst({
      where: { id: valueId, attributeTypeId },
    });
  }

  async findValueByTypeAndValueExcluding(
    attributeTypeId: string,
    value: string,
    excludeValueId: string,
  ) {
    return prisma.attributeValue.findFirst({
      where: {
        attributeTypeId,
        value,
        id: { not: excludeValueId },
      },
    });
  }

  async createValue(data: CreateAttributeValueData) {
    return prisma.attributeValue.create({
      data: {
        attributeTypeId: data.attributeTypeId,
        value: data.value,
        code: data.code,
        displayOrder: data.displayOrder,
      },
    });
  }

  async updateValue(valueId: string, data: UpdateAttributeValueData) {
    return prisma.attributeValue.update({
      where: { id: valueId },
      data: {
        ...(data.value !== undefined && { value: data.value }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.displayOrder !== undefined && {
          displayOrder: data.displayOrder,
        }),
      },
    });
  }

  async deleteValue(valueId: string) {
    return prisma.attributeValue.delete({ where: { id: valueId } });
  }
}

export default new AttributeTypeRepository();
