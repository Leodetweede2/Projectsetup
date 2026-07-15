import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("admin can create, edit, and deactivate a user, and see it audited", async ({ page }) => {
  const email = `member-${Date.now()}@example.com`;
  await signInAsAdmin(page);

  // Create a user with the USER role.
  await page.goto("/admin/users");
  await page.getByLabel("Full name").fill("New Member");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Temporary password").fill("password123");
  await page.getByRole("checkbox", { name: "USER", exact: true }).check();
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText(`User ${email} created.`)).toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(email) });
  await expect(row).toBeVisible();

  // Edit: add the MANAGER role.
  await row.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/.+/);
  await page.getByRole("checkbox", { name: "MANAGER", exact: true }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("User updated.")).toBeVisible();

  // Deactivate from the list.
  await page.goto("/admin/users");
  const row2 = page.getByRole("row", { name: new RegExp(email) });
  await row2.getByRole("button", { name: "Deactivate" }).click();
  await expect(row2.getByText("Inactive")).toBeVisible();

  // Audit log records these actions.
  await page.goto("/admin/audit");
  await expect(page.getByText("user.created").first()).toBeVisible();
  await expect(page.getByText("user.deactivated").first()).toBeVisible();
});

test("admin can toggle a role's permissions", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/admin/roles");

  const managerCard = page.getByTestId("role-card-MANAGER");
  await expect(managerCard.getByRole("heading", { name: "MANAGER" })).toBeVisible();

  // Toggle "Manage users" and save, then confirm the change persists.
  const checkbox = managerCard.getByRole("checkbox", { name: "Manage users" });
  const wasChecked = await checkbox.isChecked();
  await checkbox.setChecked(!wasChecked);
  await managerCard.getByRole("button", { name: "Save permissions" }).click();
  await expect(managerCard.getByText(/Permissions for MANAGER updated/)).toBeVisible();

  await page.reload();
  const managerCardAfter = page.getByTestId("role-card-MANAGER");
  await expect(managerCardAfter.getByRole("checkbox", { name: "Manage users" })).toBeChecked({
    checked: !wasChecked,
  });
});
