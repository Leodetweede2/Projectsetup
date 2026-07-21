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

test("search by room number selects it on the map", async ({ page }) => {
  await signInAsAdmin(page);

  // The Map page's search resolves to the room and selects it.
  await page.goto("/map?q=H1.001");
  await expect(page.getByRole("heading", { name: "H1.001" })).toBeVisible();
  await expect(page.getByText("PCs in this room")).toBeVisible();
});

test("search by PC name resolves to its room on the map", async ({ page }) => {
  await signInAsAdmin(page);

  // The seeded PC AMP-PC-0421 lives in room H1.001.
  await page.goto("/map?q=AMP-PC-0421");
  await expect(page.getByRole("heading", { name: "H1.001" })).toBeVisible();
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
