import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";

test("homepage renders the retro terminal canvas", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const container = page.locator("#container");
  await expect(container).toBeVisible();

  const canvas = container.locator("canvas").first();
  await expect(canvas).toBeVisible();

  await expect
    .poll(async () => countLitPixels(await canvas.screenshot()), {
      message: "terminal canvas should paint non-blank pixels",
      timeout: 20_000,
    })
    .toBeGreaterThan(500);

  expect(pageErrors).toEqual([]);
});

test("/cv.pdf serves the downloadable resume PDF", async ({ request }) => {
  const response = await request.get("/cv.pdf");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");

  const body = await response.body();
  expect(body.length).toBeGreaterThan(100_000);
  expect(body.subarray(0, 5).toString("utf8")).toBe("%PDF-");
});

function countLitPixels(screenshot: Buffer): number {
  const png = PNG.sync.read(screenshot);
  let litPixels = 0;
  const stride = 16;

  for (let index = 0; index < png.data.length; index += 4 * stride) {
    const red = png.data[index] ?? 0;
    const green = png.data[index + 1] ?? 0;
    const blue = png.data[index + 2] ?? 0;
    const alpha = png.data[index + 3] ?? 0;

    if (alpha > 0 && red + green + blue > 24) {
      litPixels++;
    }
  }

  return litPixels;
}
