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

test("search by room number opens the map with a highlighted pin", async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto("/find");
  await page.getByPlaceholder(/H1\.001/).fill("H1.001");
  await page.getByRole("button", { name: "Search" }).click();

  const result = page.getByRole("link", { name: /H1\.001/ });
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/find\/.+/);
  // The floor-plan image and the highlighted pin label are shown.
  await expect(page.getByRole("img", { name: "H1.001" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "H1.001" })).toBeVisible();
});

test("search by PC name resolves to its room", async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto("/find");
  await page.getByPlaceholder(/H1\.001/).fill("AMP-PC-0421");
  await page.getByRole("button", { name: "Search" }).click();

  // The seeded PC lives in room H1.001.
  await expect(page.getByRole("link", { name: /H1\.001/ })).toBeVisible();
  await expect(page.getByText("PC: AMP-PC-0421")).toBeVisible();
});

test("admin can add a room pin on the floor plan", async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto("/admin/floorplans/demo-floorplan");
  await expect(page.getByRole("img", { name: /Demo/ })).toBeVisible();

  // Click an empty spot on the map to start adding a room.
  const map = page.locator("img[alt*='Demo']");
  const box = await map.boundingBox();
  if (!box) throw new Error("map not found");
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);

  const number = `T${Date.now().toString().slice(-5)}`;
  await page.getByLabel("Room number").fill(number);
  await page.getByRole("button", { name: "Add room" }).click();

  // The new pin appears on the map (its number label is rendered).
  await expect(page.getByText(number, { exact: true })).toBeVisible();
});
