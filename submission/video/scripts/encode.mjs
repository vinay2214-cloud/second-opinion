// Encode screencast frames to H.264 MP4: real frame timing, cropped to the emulator's XR view,
// scaled to 1080 high and pillarboxed to 1920x1080. Usage: node encode.mjs <clip> [<clip> ...]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
mkdirSync('submission/video/clips', { recursive: true });
const report = [];
for (const name of process.argv.slice(2)) {
  const dir = `.tmp/frames/${name}`;
  if (!existsSync(`${dir}/frames.json`)) { report.push({ name, error: 'no frames' }); continue; }
  const frames = JSON.parse(readFileSync(`${dir}/frames.json`, 'utf8'));
  const mid = Math.max(0, Math.floor(frames.length / 2) - 15);
  const detect = execFileSync('ffmpeg', ['-hide_banner', '-framerate', '30', '-start_number', String(mid), '-i', `${dir}/%05d.jpg`, '-frames:v', '30', '-vf', 'cropdetect=limit=24:round=2:reset=0', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  let crop = '800:712:560:184';
  try {
    const all = execFileSync('sh', ['-c', `ffmpeg -hide_banner -framerate 30 -start_number ${mid} -i ${dir}/%05d.jpg -frames:v 30 -vf cropdetect=limit=24:round=2:reset=0 -f null - 2>&1 | grep -o 'crop=[0-9:]*' | sort | uniq -c | sort -rn | head -1`], { encoding: 'utf8' });
    const m = /crop=([0-9:]+)/.exec(all); if (m) crop = m[1];
  } catch {}
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].t - frames[i].t) : 1 / 30;
    lines.push(`file '${process.cwd()}/${dir}/${String(frames[i].n).padStart(5, '0')}.jpg'`, `duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${process.cwd()}/${dir}/${String(frames.at(-1).n).padStart(5, '0')}.jpg'`);
  writeFileSync(`${dir}/list.txt`, lines.join('\n') + '\n');
  const out = `submission/video/clips/${name}.mp4`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`,
    '-vf', `crop=${crop},scale=-2:1080:flags=lanczos,pad=1920:1080:(ow-iw)/2:0:color=0x0e0f13,fps=30,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', '-an', out]);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames:format=duration,size', '-of', 'json', out], { encoding: 'utf8' }));
  report.push({ name, crop, captured: frames.length, captureFps: +(frames.length / (frames.at(-1).t - frames[0].t)).toFixed(1),
    width: probe.streams[0].width, height: probe.streams[0].height, fps: probe.streams[0].r_frame_rate, seconds: +(+probe.format.duration).toFixed(2), MB: +(probe.format.size / 1048576).toFixed(2) });
}
writeFileSync('.tmp/encode-report.json', JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
