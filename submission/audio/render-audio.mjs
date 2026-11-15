// Renders the game's cue recipes (read from src/audio/cues.ts, not copied by hand) with the
// browser's own Web Audio engine in an OfflineAudioContext, scheduled exactly as playCue does
// (master gain, 8 ms attack, exponential decay, oscillator stop 20 ms after the note).
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('src/audio/cues.ts', 'utf8');
const num = (name) => Number(new RegExp(`const ${name} = ([0-9.]+);`).exec(src)[1]);
const MASTER_GAIN = num('MASTER_GAIN'), ATTACK_SEC = num('ATTACK_SEC'), SILENT = num('SILENT');
const literal = /const RECIPES[^=]*= (\{[\s\S]*?\n\});/.exec(src)[1];
const RECIPES = new Function(`return (${literal});`)();
const RATE = 48000;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const out = {};
for (const [cue, notes] of Object.entries(RECIPES)) {
  const samples = await page.evaluate(async ({ notes, MASTER_GAIN, ATTACK_SEC, SILENT, RATE }) => {
    const end = Math.max(...notes.map((n) => n.at + n.len)) + 0.005 + 0.02 + 0.1;
    const ctx = new OfflineAudioContext(1, Math.ceil(end * RATE), RATE);
    const master = ctx.createGain(); master.gain.value = MASTER_GAIN; master.connect(ctx.destination);
    const t0 = 0.005;
    for (const note of notes) {
      const start = t0 + note.at, stop = start + note.len;
      const osc = ctx.createOscillator(); osc.type = note.wave;
      osc.frequency.setValueAtTime(note.hz, start);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, stop);
      const g = ctx.createGain();
      g.gain.setValueAtTime(SILENT, start); g.gain.linearRampToValueAtTime(note.peak, start + ATTACK_SEC);
      g.gain.exponentialRampToValueAtTime(SILENT, stop);
      osc.connect(g).connect(master); osc.start(start); osc.stop(stop + 0.02);
    }
    const buf = await ctx.startRendering();
    return Array.from(buf.getChannelData(0));
  }, { notes, MASTER_GAIN, ATTACK_SEC, SILENT, RATE });
  let peak = 0, sq = 0; for (const s of samples) { peak = Math.max(peak, Math.abs(s)); sq += s * s; }
  const pcm = Buffer.alloc(44 + samples.length * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + samples.length * 2, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(RATE, 24);
  pcm.writeUInt32LE(RATE * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  out[cue] = { samples: samples.length, ms: Math.round((samples.length / RATE) * 1000), peak, peakDb: 20 * Math.log10(peak), rmsDb: 20 * Math.log10(Math.sqrt(sq / samples.length)), pcm };
}
await browser.close();
const names = { stamp: '01-stamp', advice: '02-advice-arrives', verify: '03-verify', surge: '04-surge', resultRight: '05a-result-right', resultWrong: '05b-result-wrong' };
for (const [cue, r] of Object.entries(out)) { writeFileSync(`submission/audio/${names[cue]}.wav`, r.pcm); delete r.pcm; }
console.log(JSON.stringify({ MASTER_GAIN, ATTACK_SEC, browser: 'Chromium (Playwright 1.65) OfflineAudioContext, 48 kHz mono 16-bit', cues: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { ms: v.ms, peak: +v.peak.toFixed(4), peakDbFS: +v.peakDb.toFixed(1), rmsDbFS: +v.rmsDb.toFixed(1) }])) }, null, 1));
