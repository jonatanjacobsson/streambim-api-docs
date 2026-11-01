// Builds a captioned GIF from screenshots with ffmpeg (used for docs/media/agent-demo.gif).
// Usage: node tools/make-gif.mjs <frames.json> <out.gif>
// frames.json: [{ "file": "frame.jpg", "seconds": 2.5, "caption": "text" }, ...]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const [framesFile, out] = process.argv.slice(2);
if (!framesFile || !out) throw new Error('usage: node tools/make-gif.mjs <frames.json> <out.gif>');
const frames = JSON.parse(readFileSync(framesFile, 'utf8'));
const base = dirname(resolve(framesFile));
const work = mkdtempSync(join(tmpdir(), 'gif-'));
const fwd = (p) => p.split('\\').join('/');
// ffmpeg filter arguments need ':' escaped (Windows drive letters).
const esc = (p) => fwd(p).replace(/:/g, '\\:');
const font = process.platform === 'win32' ? 'C:/Windows/Fonts/segoeuib.ttf' : '/System/Library/Fonts/Helvetica.ttc';

const list = [];
frames.forEach((f, i) => {
  const captionFile = join(work, `cap${i}.txt`);
  writeFileSync(captionFile, f.caption);
  const png = join(work, `f${i}.png`);
  const vf = `pad=iw:ih+40:0:0:color=0x16181c,drawtext=fontfile='${esc(font)}':textfile='${esc(captionFile)}':fontcolor=white:fontsize=17:x=(w-text_w)/2:y=h-29`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(base, f.file), '-vf', vf, png]);
  list.push(`file '${fwd(png)}'`, `duration ${f.seconds}`);
});
list.push(`file '${fwd(join(work, `f${frames.length - 1}.png`))}'`); // concat demuxer repeats the last frame
const listFile = join(work, 'list.txt');
writeFileSync(listFile, list.join('\n'));

const palette = 'fps=10,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4';
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', palette, '-loop', '0', out]);
console.log(`${out}: ${(statSync(out).size / 1024).toFixed(0)} KB, ${frames.length} frames`);
