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
      url: "/api/v1",
      description: env.isDev
        ? "Current host (development)"
        : "Current host (staging/production)",
    },
  ],
  components: {
    parameters: {
      PaginationPage: {
        in: "query",
        name: "page",
        schema: { type: "integer", default: 1, minimum: 1 },
        description: "Page number (1-based)",
      },
      PaginationLimit: {
        in: "query",
        name: "limit",
        schema: { type: "integer", default: 10, minimum: 1, maximum: 100 },
        description: "Items per page",
      },
      SortOrder: {
        in: "query",
        name: "sortOrder",
        schema: { type: "string", enum: ["asc", "desc"] },
        description: "Sort direction",
      },
      Search: {
        in: "query",
        name: "search",
        schema: { type: "string" },
        description: "Search term",
      },
      XTenantSlug: {
        in: "header",
        name: "X-Tenant-Slug",
        required: true,
        schema: { type: "string", example: "demo" },
        description: "Tenant slug (e.g. demo, acme)",
      },
    },
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
          currentPage: {
            type: "integer",
            description: "Current page (1-based)",
          },
          totalPages: { type: "integer", description: "Total page count" },
          totalItems: { type: "integer", description: "Total item count" },
          itemsPerPage: { type: "integer", description: "Items per page" },
          hasNextPage: {
            type: "boolean",
            description: "Whether another page exists",
          },
          hasPrevPage: {
            type: "boolean",
            description: "Whether a previous page exists",
          },
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
        description: "User in auth context (login, me) - includes tenant info",
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
      UserPublic: {
        type: "object",
        description: "User in users-module responses - public fields only",
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string" },
          role: {
            type: "string",
            enum: ["platformAdmin", "superAdmin", "admin", "user"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          tenantId: { type: "string", format: "uuid" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          imsCode: {
            type: "string",
            description:
              "Product code (barcode) for POS; equals product id when not set on create.",
          },
          name: { type: "string" },
          categoryId: { type: "string", format: "uuid" },
          subCategory: { type: "string", nullable: true },
          subCategoryId: { type: "string", format: "uuid", nullable: true },
          description: { type: "string", nullable: true },
          length: { type: "number", nullable: true },
          breadth: { type: "number", nullable: true },
          height: { type: "number", nullable: true },
          weight: { type: "number", nullable: true },
          costPrice: { type: "number" },
          mrp: { type: "number" },
          finalSp: { type: "number" },
          vendorId: { type: "string", format: "uuid", nullable: true },
          createdById: { type: "string", format: "uuid" },
          dateCreated: { type: "string", format: "date-time" },
          dateModified: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ProductVariation: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          costPriceOverride: { type: "number", nullable: true },
          mrpOverride: { type: "number", nullable: true },
          finalSpOverride: { type: "number", nullable: true },
          isActive: { type: "boolean" },
          stockQuantity: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
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
      SalePreviewResponse: {
        type: "object",
        description:
          "POST /sales/preview — totals after catalog/manual discounts and promos",
        properties: {
          subtotal: { type: "number" },
          discount: {
            type: "number",
            description: "Total discount amount (product + promo)",
          },
          productDiscount: {
            type: "number",
            description:
              "Monetary discount from catalog/manual lines only (excludes promo-only portion)",
          },
          promoDiscount: {
            type: "number",
            description: "Monetary amount attributed to applied promo codes",
          },
          promoOverrodeProductDiscount: {
            type: "boolean",
            description:
              "True when a promo replaced or beat product discount (non-stacking)",
          },
          total: { type: "number" },
        },
        required: [
          "subtotal",
          "discount",
          "productDiscount",
          "promoDiscount",
          "promoOverrodeProductDiscount",
          "total",
        ],
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
          code: { type: "string" },
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
      PaginatedUsersResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/UserPublic" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedCategoriesResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Category" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedProductsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Product" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedVendorsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Vendor" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedLocationsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Location" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedMembersResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Member" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedSalesResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: { type: "array", items: { $ref: "#/components/schemas/Sale" } },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedPromosResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Promo" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedTransfersResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Transfer" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedCompaniesResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Company" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedContactsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Contact" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedLeadsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: { type: "array", items: { $ref: "#/components/schemas/Lead" } },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedPipelinesResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Pipeline" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedDealsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: { type: "array", items: { $ref: "#/components/schemas/Deal" } },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedTasksResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: { type: "array", items: { $ref: "#/components/schemas/Task" } },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedActivitiesResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Activity" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedInventoryResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/InventoryItem" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedNotificationsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Notification" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid", nullable: true },
          userId: { type: "string", format: "uuid" },
          action: { type: "string" },
          resource: { type: "string", nullable: true },
          resourceId: { type: "string", nullable: true },
          details: { type: "object", nullable: true },
          ip: { type: "string", nullable: true },
          userAgent: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ErrorReport: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid", nullable: true },
          userId: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          pageUrl: { type: "string", nullable: true },
          status: { type: "string", enum: ["OPEN", "REVIEWED", "RESOLVED"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      DeleteBody: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            maxLength: 500,
            description: "Optional reason for delete (logged for audit)",
          },
        },
      },
      TrashItem: {
        type: "object",
        properties: {
          entityType: {
            type: "string",
            description: "Entity type (e.g. Product, Category)",
          },
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          deletedAt: { type: "string", format: "date-time" },
          deletedBy: {
            type: "string",
            nullable: true,
            description: "UserId of user who deleted",
          },
          deleteReason: {
            type: "string",
            nullable: true,
            description: "Optional reason provided at delete",
          },
          tenantId: { type: "string", format: "uuid" },
          tenantName: { type: "string" },
        },
      },
      PaginatedAuditResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/AuditLog" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedErrorReportsResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/ErrorReport" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      PaginatedTrashResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/TrashItem" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      WorkflowRule: {
        type: "object",
        description: "A single rule in a workflow (trigger + action + config)",
        properties: {
          id: { type: "string", format: "uuid" },
          trigger: {
            type: "string",
            enum: [
              "STAGE_ENTER",
              "STAGE_EXIT",
              "DEAL_CREATED",
              "DEAL_WON",
              "DEAL_LOST",
            ],
          },
          triggerStageId: { type: "string", nullable: true },
          action: {
            type: "string",
            enum: [
              "CREATE_TASK",
              "SEND_NOTIFICATION",
              "MOVE_STAGE",
              "UPDATE_FIELD",
              "CREATE_ACTIVITY",
            ],
          },
          actionConfig: { type: "object", additionalProperties: true },
          ruleOrder: { type: "integer" },
        },
      },
      Workflow: {
        type: "object",
        description: "Pipeline workflow with rules",
        properties: {
          id: { type: "string", format: "uuid" },
          tenantId: { type: "string", format: "uuid" },
          pipelineId: { type: "string", format: "uuid" },
          name: { type: "string" },
          isActive: { type: "boolean" },
          pipeline: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
            },
          },
          rules: {
            type: "array",
            items: { $ref: "#/components/schemas/WorkflowRule" },
          },
        },
      },
      CreateWorkflowInput: {
        type: "object",
        required: ["pipelineId", "name"],
        properties: {
          pipelineId: { type: "string", format: "uuid" },
          name: { type: "string", minLength: 1, maxLength: 255 },
          isActive: { type: "boolean", default: true },
          rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                trigger: {
                  type: "string",
                  enum: [
                    "STAGE_ENTER",
                    "STAGE_EXIT",
                    "DEAL_CREATED",
                    "DEAL_WON",
                    "DEAL_LOST",
                  ],
                },
                triggerStageId: { type: "string", nullable: true },
                action: {
                  type: "string",
                  enum: [
                    "CREATE_TASK",
                    "SEND_NOTIFICATION",
                    "MOVE_STAGE",
                    "UPDATE_FIELD",
                    "CREATE_ACTIVITY",
                  ],
                },
                actionConfig: { type: "object" },
                ruleOrder: { type: "integer" },
              },
            },
          },
        },
      },
      UpdateWorkflowInput: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 255 },
          isActive: { type: "boolean" },
          rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                trigger: {
                  type: "string",
                  enum: [
                    "STAGE_ENTER",
                    "STAGE_EXIT",
                    "DEAL_CREATED",
                    "DEAL_WON",
                    "DEAL_LOST",
                  ],
                },
                triggerStageId: { type: "string", nullable: true },
                action: {
                  type: "string",
                  enum: [
                    "CREATE_TASK",
                    "SEND_NOTIFICATION",
                    "MOVE_STAGE",
                    "UPDATE_FIELD",
                    "CREATE_ACTIVITY",
                  ],
                },
                actionConfig: { type: "object" },
                ruleOrder: { type: "integer" },
              },
            },
          },
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
    {
      name: "Workflows",
      description: "Pipeline workflow automation (triggers and actions)",
    },
    {
      name: "Messaging",
      description:
        "Messenger channels (OAuth or manual dev connect) and inbox integration",
    },
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
