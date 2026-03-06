import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import { SwaggerDefinition } from "swagger-jsdoc";
import { getVersion } from "@/config/version";
import { env } from "@/config/env";

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "IMS API Documentation",
    version: getVersion(),
    description: "API documentation for Inventory Management System",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: env.publicApiUrl,
      description: env.isDev
        ? "Development server"
        : "API server (staging/production)",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token obtained from /auth/login endpoint",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", description: "Current page (1-based)" },
          limit: { type: "integer", description: "Items per page" },
          totalItems: { type: "integer", description: "Total item count" },
          totalPages: { type: "integer", description: "Total page count" },
        },
      },
      ApiSuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          data: { type: "object", description: "Response payload" },
        },
        description:
          "Standard success response. Some endpoints also return { message, ... } directly.",
      },
      ApiErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string", description: "Error message" },
        },
        description: "Standard error response",
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string" },
          role: {
            type: "string",
            enum: ["platformAdmin", "superAdmin", "admin", "user"],
          },
          tenantId: { type: "string", format: "uuid", nullable: true },
          tenantSlug: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
          },
          description: {
            type: "string",
            nullable: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          imsCode: {
            type: "string",
          },
          name: {
            type: "string",
          },
          categoryId: {
            type: "string",
            format: "uuid",
          },
          description: {
            type: "string",
            nullable: true,
          },
          length: {
            type: "number",
            nullable: true,
          },
          breadth: {
            type: "number",
            nullable: true,
          },
          height: {
            type: "number",
            nullable: true,
          },
          weight: {
            type: "number",
            nullable: true,
          },
          costPrice: {
            type: "number",
          },
          mrp: {
            type: "number",
          },
          createdById: {
            type: "string",
            format: "uuid",
          },
          dateCreated: {
            type: "string",
            format: "date-time",
          },
          dateModified: {
            type: "string",
            format: "date-time",
          },
        },
      },
      Vendor: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          contact: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          address: { type: "string", nullable: true },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Location: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          type: { type: "string", enum: ["WAREHOUSE", "SHOWROOM"] },
          address: { type: "string", nullable: true },
          isDefaultWarehouse: { type: "boolean" },
          isActive: { type: "boolean" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Member: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          phone: { type: "string" },
          name: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Sale: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          saleCode: { type: "string" },
          locationId: { type: "string", format: "uuid" },
          total: { type: "number" },
          subtotal: { type: "number" },
          discount: { type: "number" },
          type: { type: "string", enum: ["GENERAL", "MEMBER"] },
          isCreditSale: { type: "boolean" },
          tenantId: { type: "string", format: "uuid" },
          createdById: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Promo: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string" },
          description: { type: "string", nullable: true },
          valueType: { type: "string", enum: ["PERCENTAGE", "FLAT"] },
          value: { type: "number" },
          eligibility: {
            type: "string",
            enum: ["ALL", "MEMBER", "NON_MEMBER", "WHOLESALE"],
          },
          validFrom: { type: "string", format: "date-time", nullable: true },
          validTo: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Transfer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          transferCode: { type: "string" },
          status: {
            type: "string",
            enum: [
              "PENDING",
              "APPROVED",
              "IN_TRANSIT",
              "COMPLETED",
              "CANCELLED",
            ],
          },
          fromLocationId: { type: "string", format: "uuid" },
          toLocationId: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      InventoryItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          locationId: { type: "string", format: "uuid" },
          variationId: { type: "string", format: "uuid" },
          subVariationId: { type: "string", format: "uuid", nullable: true },
          quantity: { type: "integer" },
        },
      },
      AttributeType: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          code: { type: "string", nullable: true },
          displayOrder: { type: "integer" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AttributeValue: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          value: { type: "string" },
          code: { type: "string", nullable: true },
          displayOrder: { type: "integer" },
          attributeTypeId: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Company: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Contact: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          companyId: { type: "string", format: "uuid", nullable: true },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Lead: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          status: { type: "string" },
          sourceId: { type: "string", format: "uuid", nullable: true },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Pipeline: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Deal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          value: { type: "number" },
          stageId: { type: "string", format: "uuid" },
          pipelineId: { type: "string", format: "uuid" },
          contactId: { type: "string", format: "uuid", nullable: true },
          leadId: { type: "string", format: "uuid", nullable: true },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          dealId: { type: "string", format: "uuid", nullable: true },
          dueDate: { type: "string", format: "date-time", nullable: true },
          isCompleted: { type: "boolean" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Activity: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string" },
          subject: { type: "string" },
          dealId: { type: "string", format: "uuid", nullable: true },
          contactId: { type: "string", format: "uuid", nullable: true },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          body: { type: "string", nullable: true },
          isRead: { type: "boolean" },
          userId: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Tenant: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string" },
          name: { type: "string" },
          isActive: { type: "boolean" },
          planTier: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  tags: [
    { name: "Authentication", description: "Login, logout, and current user" },
    { name: "Users", description: "User management (superAdmin)" },
    { name: "Products", description: "Product catalog and variations" },
    { name: "Categories", description: "Category and subcategory management" },
    {
      name: "AttributeTypes",
      description: "Attribute types and values (e.g. size, color)",
    },
    { name: "Vendors", description: "Vendor/supplier management" },
    { name: "Locations", description: "Warehouses and showrooms" },
    { name: "Inventory", description: "Stock levels and transfers" },
    { name: "Transfers", description: "Stock transfer requests" },
    { name: "Members", description: "Member/customer management" },
    { name: "Sales", description: "Sales and receipts" },
    { name: "Promos", description: "Promotions and discount codes" },
    { name: "Audit", description: "Audit logs (superAdmin)" },
    { name: "ErrorReports", description: "Client-side error reports" },
    { name: "Analytics", description: "Analytics and reports" },
    { name: "Dashboard", description: "Dashboard summaries" },
    { name: "Bulk", description: "Bulk upload and download" },
    { name: "Platform", description: "Platform admin (tenants, plans)" },
    { name: "Companies", description: "Company/organization management" },
    { name: "Contacts", description: "Contact management" },
    { name: "Leads", description: "Lead management" },
    { name: "Pipelines", description: "Sales pipeline stages" },
    { name: "Deals", description: "Deal/opportunity management" },
    { name: "Tasks", description: "Task management" },
    { name: "Activities", description: "Activity log" },
    { name: "Notifications", description: "User notifications" },
    { name: "CRM", description: "CRM dashboard and reports" },
    { name: "CRMSettings", description: "CRM sources and journey types" },
    { name: "Trash", description: "Soft-deleted items restore" },
  ],
};

const modulesDir = path.join(__dirname, "../modules");
const options = {
  definition: swaggerDefinition,
  apis: [
    path.join(modulesDir, "**/*.router.{ts,js}"),
    path.join(modulesDir, "**/*.controller.{ts,js}"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
