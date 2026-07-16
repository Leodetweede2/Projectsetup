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

test("asset list overview shows rows and links matched rooms to the map", async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto("/list");
  // Seeded demo rows are present.
  await expect(page.getByText("AMP-PC-0510")).toBeVisible();
  await expect(page.getByText("Dr. Jansen")).toBeVisible();

  // A row whose room number matches a placed pin links to the map; H1.099 does not.
  const matched = page.getByRole("row", { name: /AMP-PC-0421/ });
  await expect(matched.getByRole("link", { name: /Show on map/ })).toBeVisible();
  const unmatched = page.getByRole("row", { name: /AMP-PC-9999/ });
  await expect(unmatched.getByText("not on a map")).toBeVisible();

  // Search filters across columns.
  await page.getByPlaceholder(/Search room/).fill("Jansen");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("AMP-PC-0510")).toBeVisible();
  await expect(page.getByText("AMP-PC-0333")).toHaveCount(0);
});

test("the room viewer shows asset-list rows for that room", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/find/demo-room-1"); // H1.001
  await expect(page.getByText(/From the asset list/)).toBeVisible();
  // The value appears in the asset-list table (and also in the device list).
  await expect(page.getByRole("cell", { name: "Balie 1" })).toBeVisible();
});

test("importing an Excel export replaces the current list", async ({ page }) => {
  await signInAsAdmin(page);

  const result = await page.evaluate(async () => {
    const res = await fetch("/api/assets/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "e2e.xlsx",
        roomNumberColumn: "Ruimtenummer",
        columns: ["Ruimtenummer", "PC-naam"],
        rows: [{ Ruimtenummer: "H1.002", "PC-naam": "E2E-PC-777" }],
      }),
    });
    return { status: res.status, body: await res.text() };
  });
  expect(result.status).toBe(200);

  await page.goto("/list");
  await expect(page.getByText("E2E-PC-777")).toBeVisible();
  // Old demo rows were replaced.
  await expect(page.getByText("AMP-PC-0510")).toHaveCount(0);
});
