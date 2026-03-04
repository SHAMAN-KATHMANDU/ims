export * from "./hooks/use-contacts";
export * from "./hooks/use-leads";
export * from "./hooks/use-deals";
export * from "./hooks/use-companies";
export * from "./hooks/use-tasks";
export * from "./hooks/use-pipelines";
export * from "./hooks/use-activities";
export * from "./hooks/use-notifications";
export * from "./hooks/use-crm-settings";
export * from "./hooks/use-crm";

export type {
  Contact,
  CreateContactData,
  ContactDetail as ContactDetailType,
} from "./services/contact.service";
export type { Lead, LeadStatus, CreateLeadData } from "./services/lead.service";
export type {
  Deal,
  CreateDealData,
  UpdateDealData,
} from "./services/deal.service";
export type { Company, CreateCompanyData } from "./services/company.service";
export type {
  Task,
  CreateTaskData,
  UpdateTaskData,
} from "./services/task.service";
export type { Pipeline, PipelineStage } from "./services/pipeline.service";
export type {
  CrmSource,
  CrmJourneyType,
} from "./services/crm-settings.service";

export { CrmDashboardPage } from "./components/CrmDashboardPage";
export { ContactsPage } from "./components/contacts/ContactsPage";
export { ContactDetail } from "./components/contacts/ContactDetail";
export { LeadsPage } from "./components/leads/LeadsPage";
export { DealsKanbanPage } from "./components/deals/DealsKanbanPage";
export { DealDetail } from "./components/deals/DealDetail";
export { CompaniesPage } from "./components/companies/CompaniesPage";
export { TasksPage } from "./components/tasks/TasksPage";
export { NotificationsPage } from "./components/notifications/NotificationsPage";
export { default as CrmSettingsPage } from "./components/settings/CrmSettingsPage";
export { CrmReportsPage } from "./components/reports/CrmReportsPage";
export { ContactForm } from "./components/contacts/ContactForm";
export { CompanyForm } from "./components/companies/CompanyForm";
export { TaskForm } from "./components/tasks/TaskForm";
export { LeadForm } from "./components/leads/LeadForm";
export { DealForm } from "./components/deals/DealForm";
