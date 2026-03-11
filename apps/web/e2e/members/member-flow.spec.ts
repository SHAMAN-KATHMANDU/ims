import {
  test,
  expect,
  E2E_SLUG,
  E2E_USERNAME,
  E2E_PASSWORD,
} from "../fixtures";

test.describe("Member flow", () => {
  test.beforeEach(async ({ slugEntryPage, loginPage, page }) => {
    await slugEntryPage.goto();
    await slugEntryPage.enterSlugAndGo(E2E_SLUG);
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await expect(page).toHaveURL(new RegExp(`/${E2E_SLUG}(/)?$`));
  });

  test("creates member via dialog and sees success toast", async ({
    membersPage,
  }) => {
    await membersPage.goto(E2E_SLUG);
    await membersPage.expectLoaded();

    await membersPage.clickAddMember();
    await membersPage.fillMemberForm({
      phone: `+97798${Date.now().toString().slice(-7)}`,
      name: "E2E Test Member",
    });
    await membersPage.submitMemberForm();

    await membersPage.expectSuccessToast();
  });

  test("creates member via new page and redirects to members list", async ({
    membersPage,
  }) => {
    await membersPage.gotoNewMember(E2E_SLUG);
    await membersPage.expectNewMemberLoaded();

    await membersPage.fillInlineMemberForm({
      phone: `+97798${Date.now().toString().slice(-7)}`,
      name: "E2E Inline Member",
    });
    await membersPage.submitInlineMemberForm();

    await membersPage.expectRedirectToMembers();
    await membersPage.expectSuccessToast();
  });

  test("bulk upload page loads", async ({ membersPage }) => {
    await membersPage.gotoBulkUpload(E2E_SLUG);
    await membersPage.expectBulkUploadLoaded();
  });
});
