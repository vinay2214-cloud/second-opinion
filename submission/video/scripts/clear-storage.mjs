// Fresh profile for the app origin: clear localStorage, sessionStorage, IndexedDB and caches.
export default async function run({ page, context }) {
  const before = await page.evaluate(() => Object.keys(localStorage));
  await page.evaluate(async () => {
    localStorage.clear(); sessionStorage.clear();
    if (indexedDB.databases) for (const d of await indexedDB.databases()) if (d.name) indexedDB.deleteDatabase(d.name);
    if (self.caches) for (const k of await caches.keys()) await caches.delete(k);
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const after = await page.evaluate(() => Object.keys(localStorage));
  return { before, after };
}
