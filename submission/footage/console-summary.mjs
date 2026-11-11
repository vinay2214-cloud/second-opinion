// Dev helper: summarise the managed browser console. Usage: node tools/console-summary.mjs [regex]
import { execFileSync } from 'node:child_process';
const out = execFileSync('npx', ['iwsdk', 'browser', 'logs', '--input-json', '{"count":200}'], { encoding: 'utf8', maxBuffer: 64e6 });
const parsed = JSON.parse(out);
if (!parsed.ok) { console.log('logs failed:', JSON.stringify(parsed.error).slice(0, 400)); process.exit(1); }
const rows = parsed.data.result;
const counts = {};
for (const r of rows) counts[r.level] = (counts[r.level] || 0) + 1;
console.log('console levels:', JSON.stringify(counts));
const re = new RegExp(process.argv[2] || 'placement|intent|token', 'i');
for (const r of rows.filter((r) => re.test(r.message) || /error|warn/.test(r.level)).slice(-Number(process.argv[3] || 14)))
  console.log(r.level, new Date(r.timestamp).toISOString().slice(11, 23), r.message.slice(0, 240));
