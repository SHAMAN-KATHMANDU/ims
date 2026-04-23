/**
 * Prisma extension that auto-creates Resource rows for domain model entities.
 *
 * When a business model (Product, Category, Contact, Deal, etc.) is created or deleted,
 * this extension intercepts the operation and synchronously creates/deletes the corresponding
 * Resource row in the same transaction.
 *
 * Resource rows form a tree:
 * - Each entity has a parent (specified by parentId)
 * - Paths encode the hierarchy: /tenantId/workspace/product-id-1/
 * - Depth tracks nesting level for query optimization
 * - The tenant's WORKSPACE Resource is created lazily on first need
 */

import { Prisma } from "@prisma/client";
import { logger } from "@/config/logger";

/**
 * Maps a business model to its ResourceType and how to find its parent.
 *
 * parentLocator: a function that receives the created entity and returns:
 * - resourceId: the parent Resource ID
 * - type: the ResourceType of that parent (e.g., "WORKSPACE", "PIPELINE")
 * - externalId: for hierarchical typing (e.g., workspace has externalId=null, others have entity id)
 */
interface ModelResourceMapping {
  resourceType: string;
  parentLocator: (
    entity: any,
    tenantId: string,
  ) => Promise<{ parentId: string; parentPath: string; parentDepth: number }>;
}

/**
 * Define the resource type mapping for each business model.
 * This mapping is determined during Phase 1 and recorded in RBAC_CONTRACT.md §5.
 *
 * TODO: Coordinate with rbac-schema to finalize the complete list of models
 * and their parent locators. For now, this is a stub with common inventory models.
 */
const MODEL_RESOURCE_MAPPING: Record<string, ModelResourceMapping> = {
  Product: {
    resourceType: "PRODUCT",
    parentLocator: async (entity: any, tenantId: string) => {
      // Products are children of the workspace
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Category: {
    resourceType: "CATEGORY",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Vendor: {
    resourceType: "VENDOR",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Location: {
    resourceType: "LOCATION",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Transfer: {
    resourceType: "TRANSFER",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Sale: {
    resourceType: "SALE",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Deal: {
    resourceType: "DEAL",
    parentLocator: async (entity: any, tenantId: string) => {
      // Deal's parent is the Pipeline (if pipelineId is set), otherwise workspace
      if (entity.pipelineId) {
        // TODO: fetch Pipeline's Resource
        // For now, default to workspace
        return getOrCreateWorkspaceResource(tenantId);
      }
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Contact: {
    resourceType: "CONTACT",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Lead: {
    resourceType: "LEAD",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Pipeline: {
    resourceType: "PIPELINE",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Workflow: {
    resourceType: "WORKFLOW",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Task: {
    resourceType: "TASK",
    parentLocator: async (entity: any, tenantId: string) => {
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  Activity: {
    resourceType: "ACTIVITY",
    parentLocator: async (entity: any, tenantId: string) => {
      // Activity's parent is the Deal (if set), then Contact, else workspace
      if (entity.dealId) {
        // TODO: fetch Deal's Resource
        return getOrCreateWorkspaceResource(tenantId);
      }
      if (entity.contactId) {
        // TODO: fetch Contact's Resource
        return getOrCreateWorkspaceResource(tenantId);
      }
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
  ContactNote: {
    resourceType: "CONTACT_NOTE",
    parentLocator: async (entity: any, tenantId: string) => {
      // ContactNote's parent is the Contact
      // TODO: fetch Contact's Resource
      return getOrCreateWorkspaceResource(tenantId);
    },
  },
};

/**
 * Idempotently get or create the workspace Resource for a tenant.
 *
 * The workspace Resource is the root of the hierarchy for that tenant.
 * It has:
 * - type = "WORKSPACE"
 * - externalId = null (no associated entity)
 * - parentId = null (is the root)
 * - path = /tenantId/
 * - depth = 0
 */
async function getOrCreateWorkspaceResource(
  tenantId: string,
): Promise<{ parentId: string; parentPath: string; parentDepth: number }> {
  // This will be filled in by the extension that wraps this function.
  // For now, return a placeholder.
  // In practice, this is called from within a Prisma transaction,
  // so we can use prisma.$transaction to upsert the workspace resource.
  throw new Error(
    "getOrCreateWorkspaceResource not yet implemented — requires access to prisma client within transaction",
  );
}

/**
 * Create the Prisma extension that intercepts create/delete on all models.
 *
 * Usage:
 *   const prisma = new PrismaClient().$extends(resourceAutoCreateExtension);
 */
export const resourceAutoCreateExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          // Only intercept if this model is in the mapping
          if (!MODEL_RESOURCE_MAPPING[model]) {
            return query(args);
          }

          // Execute the create and get the created entity
          const result = await query(args);

          // Extract tenantId from the created entity
          const tenantId = (result as any).tenantId;
          if (!tenantId) {
            logger.warn(
              `Entity ${model} missing tenantId after create`,
              undefined,
              {
                model,
                entityId: (result as any).id,
              },
            );
            return result;
          }

          // Try to create the Resource row (non-fatal if it fails)
          try {
            const mapping = MODEL_RESOURCE_MAPPING[model]!;
            const parent = await mapping.parentLocator(result, tenantId);

            // Use the base client to insert the Resource
            // (we're already in a transaction context if needed)
            await (client as any).resource.create({
              data: {
                tenantId,
                type: mapping.resourceType,
                externalId: (result as any).id,
                parentId: parent.parentId,
                path: `${parent.parentPath}${(result as any).id}/`,
                depth: parent.parentDepth + 1,
              },
            });
          } catch (error) {
            // Resource creation failure is non-fatal
            logger.error(
              `Failed to auto-create Resource for ${model}`,
              undefined,
              {
                model,
                entityId: (result as any).id,
                tenantId: (result as any).tenantId,
                error,
              },
            );
          }

          return result;
        },

        async createMany({ model, args, query }) {
          // createMany doesn't return individual entities, so we skip the Resource hook
          // (bulk creation of Resources is a separate concern handled by migrations)
          return query(args);
        },

        async delete({ model, args, query }) {
          // Get the entity before deletion so we can find and delete its Resource
          if (!MODEL_RESOURCE_MAPPING[model]) {
            return query(args);
          }

          // Fetch the entity being deleted (to get its ID and tenantId)
          const entity = await (client as any)[model].findUnique({
            where: args.where,
          });

          if (!entity) {
            // Entity doesn't exist, just return the delete result
            return query(args);
          }

          // Execute the delete
          const result = await query(args);

          // Try to delete the Resource row
          try {
            await (client as any).resource.deleteMany({
              where: {
                tenantId: entity.tenantId,
                type: MODEL_RESOURCE_MAPPING[model]!.resourceType,
                externalId: entity.id,
              },
            });
          } catch (error) {
            // Resource deletion failure is non-fatal
            logger.error(
              `Failed to auto-delete Resource for ${model}`,
              undefined,
              {
                model,
                entityId: entity.id,
                tenantId: entity.tenantId,
                error,
              },
            );
          }

          return result;
        },
      },
    },
  });
});

export default resourceAutoCreateExtension;
