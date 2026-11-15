// Fresh-profile load test of the live site. New browser, new context: no cache, no storage.
// Records console messages, failed or >=400 responses, load time and a screenshot. No coach press.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const BASE = 'https://vinay2214-cloud.github.io/second-opinion/';
const results = [];
for (const [label, url] of [['default', BASE], ['safe', BASE + '?safe=1']]) {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const consoleRows = []; const bad = []; const failed = []; const requests = [];
  page.on('console', (m) => consoleRows.push({ type: m.type(), text: m.text().slice(0, 300) }));
  page.on('pageerror', (e) => consoleRows.push({ type: 'pageerror', text: String(e?.message ?? e).slice(0, 300) }));
  page.on('requestfailed', (r) => failed.push({ url: r.url(), why: r.failure()?.errorText }));
  page.on('response', (r) => { requests.push({ url: r.url(), status: r.status() }); if (r.status() >= 400) bad.push({ url: r.url(), status: r.status() }); });
  const t0 = Date.now();
  const nav = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  const loadMs = Date.now() - t0;
  const timing = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), transferKB: Math.round(performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024) + Math.round((n.transferSize || 0) / 1024) }; });
  // Wait for the scene to finish starting (the app logs its ready line), up to 30 s.
  let ready = null;
  for (let i = 0; i < 60 && !ready; i++) { ready = consoleRows.find((c) => /\[shift\] ready|\[placement\]|\[scene\]/.test(c.text)) ?? null; if (!ready) await page.waitForTimeout(500); }
  await page.waitForTimeout(3000);
  const readyMs = ready ? 'seen' : 'not seen';
  const canvas = await page.evaluate(() => { const c = document.querySelector('canvas'); return c ? { w: c.width, h: c.height } : null; });
  const shot = `submission/live-test/live-${label}.png`;
  await page.screenshot({ path: shot });
  const coachRequests = requests.filter((r) => /workers\.dev/.test(r.url));
  const scripts = requests.filter((r) => /\/assets\/.*\.js$/.test(r.url)).map((r) => r.url);
  let bundleHasProxy = false;
  for (const s of scripts) { const body = await (await context.request.get(s)).text(); if (/second-opinion-coach\.[a-z0-9-]+\.workers\.dev\/coach/.test(body)) bundleHasProxy = true; }
  results.push({ label, url, httpStatus: nav?.status(), loadMs, timing, readyLog: readyMs, readyLine: ready?.text?.slice(0, 160) ?? null, canvas,
    requests: requests.length, requestList: requests, non2xx: bad, failed, coachRequests: coachRequests.length, bundleHasProxyUrl: bundleHasProxy,
    console: { errors: consoleRows.filter((c) => c.type === "error" || c.type === "pageerror"), warnings: consoleRows.filter((c) => c.type === "warning"), all: consoleRows }, screenshot: shot });
  await browser.close();
}
writeFileSync('.tmp/live-test.json', JSON.stringify(results, null, 2));
for (const r of results) console.log(JSON.stringify({ ...r, console: { ...r.console, errors: r.console.errors.length } }));
for (const r of results) for (const e of r.console.errors) console.log(r.label, 'ERROR', e.text);
