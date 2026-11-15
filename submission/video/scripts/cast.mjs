// CDP screencast of the managed page. Clip name and max seconds come from .tmp/cast-args.json.
// Stops when .tmp/cast-stop exists or the time is up (lease limit is 110 s).
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
export default async function run({ page, cdp, workspaceRoot }) {
  const { name, maxSec } = JSON.parse(readFileSync(`${workspaceRoot}/.tmp/cast-args.json`, 'utf8'));
  const dir = `${workspaceRoot}/.tmp/frames/${name}`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const stopFile = `${workspaceRoot}/.tmp/cast-stop`;
  rmSync(stopFile, { force: true });
  const vs = page.viewportSize();
  if (!vs || vs.width !== 1920 || vs.height !== 1080) await page.setViewportSize({ width: 1920, height: 1080 });
  const frames = [];
  const onFrame = async (f) => {
    const n = frames.length;
    writeFileSync(`${dir}/${String(n).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'));
    frames.push({ n, t: f.metadata.timestamp, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  };
  cdp.on('Page.screencastFrame', onFrame);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  writeFileSync(`${workspaceRoot}/.tmp/cast-started`, String(Date.now()));
  const t0 = Date.now();
  while (Date.now() - t0 < maxSec * 1000 && !existsSync(stopFile)) await new Promise((r) => setTimeout(r, 100));
  await cdp.send('Page.stopScreencast');
  cdp.off?.('Page.screencastFrame', onFrame);
  writeFileSync(`${dir}/frames.json`, JSON.stringify(frames));
  rmSync(`${workspaceRoot}/.tmp/cast-started`, { force: true });
  return { name, frames: frames.length, seconds: frames.length ? +(frames.at(-1).t - frames[0].t).toFixed(2) : 0, size: frames[0] && `${frames[0].w}x${frames[0].h}` };
}
