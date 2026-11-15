export default async function run({ page }) { await page.setViewportSize({ width: 1920, height: 1080 }); return page.viewportSize(); }
