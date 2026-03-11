import { test as base } from "@playwright/test";
import { SlugEntryPage } from "./pages/slug-entry.page";
import { LoginPage } from "./pages/login.page";
import { DashboardPage } from "./pages/dashboard.page";
import { ProductsPage } from "./pages/products.page";
import { NewSalePage } from "./pages/new-sale.page";
import { CreateTransferPage } from "./pages/create-transfer.page";
import { MembersPage } from "./pages/members.page";
import { ContactsPage } from "./pages/contacts.page";
import { SettingsPage } from "./pages/settings.page";

export const E2E_SLUG = process.env.E2E_TENANT_SLUG ?? "test1";
export const E2E_USERNAME = process.env.E2E_USERNAME ?? "admin";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "test123";

type Fixtures = {
  slugEntryPage: SlugEntryPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  productsPage: ProductsPage;
  newSalePage: NewSalePage;
  createTransferPage: CreateTransferPage;
  membersPage: MembersPage;
  contactsPage: ContactsPage;
  settingsPage: SettingsPage;
};

export const test = base.extend<Fixtures>({
  slugEntryPage: async ({ page }, inject) => {
    await inject(new SlugEntryPage(page));
  },
  loginPage: async ({ page }, inject) => {
    await inject(new LoginPage(page));
  },
  dashboardPage: async ({ page }, inject) => {
    await inject(new DashboardPage(page));
  },
  productsPage: async ({ page }, inject) => {
    await inject(new ProductsPage(page));
  },
  newSalePage: async ({ page }, inject) => {
    await inject(new NewSalePage(page));
  },
  createTransferPage: async ({ page }, inject) => {
    await inject(new CreateTransferPage(page));
  },
  membersPage: async ({ page }, inject) => {
    await inject(new MembersPage(page));
  },
  contactsPage: async ({ page }, inject) => {
    await inject(new ContactsPage(page));
  },
  settingsPage: async ({ page }, inject) => {
    await inject(new SettingsPage(page));
  },
});

export { expect } from "@playwright/test";
