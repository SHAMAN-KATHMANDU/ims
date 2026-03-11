import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

test.describe("CRM contact flow", () => {
  test.beforeEach(async ({ slugEntryPage, loginPage, page }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}(/)?$`));
  });

  test("creates contact via Add Contact and sees success", async ({
    contactsPage,
  }) => {
    await contactsPage.goto(E2E_SLUG);
    await contactsPage.expectLoaded();

    await contactsPage.clickAddContact();
    await contactsPage.fillContactForm({
      firstName: `E2E${Date.now().toString().slice(-6)}`,
      lastName: "TestContact",
      email: `e2e-${Date.now()}@example.com`,
    });
    await contactsPage.submitContactForm();

    await contactsPage.expectSuccessToast();
  });

  test("creates contact via new page and redirects to contacts list", async ({
    contactsPage,
  }) => {
    await contactsPage.gotoNewContact(E2E_SLUG);
    await contactsPage.expectNewContactLoaded();

    await contactsPage.fillNewContactForm({
      firstName: `E2ENew${Date.now().toString().slice(-6)}`,
      lastName: "Contact",
      email: `e2e-new-${Date.now()}@example.com`,
    });
    await contactsPage.submitNewContactForm();

    await contactsPage.expectRedirectToContacts();
    await contactsPage.expectSuccessToast();
  });
});
