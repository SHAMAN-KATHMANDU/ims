export * from "./src/utils/date";
export * from "./src/media/mimeFromExtension";
export * from "./src/types/user";
export * from "./src/config/features";
export * from "./src/config/env-features";
export * from "./src/automation/automation-enums";
export * from "./src/automation/automation-trigger-events";
export * from "./src/automation/automation-schemas";
export * from "./src/automation/automation-template-catalog";
export * from "./src/automation/automation-flow-graph";
export * from "./src/crm/pipeline-templates";
export * from "./src/crm/workflow-enums";
export * from "./src/crm/workflow-ui-metadata";
export * from "./src/crm/workflow-templates";
export * from "./src/crm/contact-profile";
export * from "./src/site-schema";

/**
 * Application version - single source for frontend/build-time use.
 * API reads from root VERSION file via apps/api/src/config/version.ts.
 * Keep in sync with root VERSION file.
 */
export const APP_VERSION = "1.0.0";
