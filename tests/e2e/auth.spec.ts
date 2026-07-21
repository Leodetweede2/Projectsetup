import { test, expect } from "@playwright/test";

/**
 * These tests assume the database has been migrated and seeded:
 *   npm run db:deploy && npm run db:seed
 * with the default seed admin (admin@example.com / admin12345).
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

test("admin can sign in and reach the admin area", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();

  // Admin-only nav should be present for the seeded admin.
  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible();

  // Sign out.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("invalid credentials are rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("public self-registration is disabled", async ({ page }) => {
  // The sign-in page no longer offers a way to create an account.
  await page.goto("/login");
  await expect(page.getByRole("link", { name: /Create one/ })).toHaveCount(0);
  await expect(page.getByText(/created by an administrator/i)).toBeVisible();

  // Visiting /register directly redirects to the sign-in page.
  await page.goto("/register");
  await expect(page).toHaveURL(/\/login/);
});
