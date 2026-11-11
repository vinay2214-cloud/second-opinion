// usage: node waitlog.mjs "<text>" <max seconds>  wait for the text in console rows after the latest "[shift] start"
import { execFileSync } from 'node:child_process';
const [text, max] = [process.argv[2], Number(process.argv[3])];
const t0 = Date.now();
for (;;) {
  const rows = JSON.parse(execFileSync('npx', ['iwsdk', 'browser', 'logs', '--input-json', '{"count":200}'], { encoding: 'utf8', maxBuffer: 64e6 })).data.result;
  const start = rows.map((r) => r.message).lastIndexOf('[shift] start');
  if (start >= 0 && rows.slice(start).some((r) => r.message.includes(text))) process.exit(0);
  if (Date.now() - t0 > max * 1000) { console.log('TIMEOUT waiting for ' + text); process.exit(1); }
  await new Promise((r) => setTimeout(r, 1500));
}
