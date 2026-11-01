// Runs every example in widget/spec/*.mjs inside the live widget and records the output.
// The doc builder only publishes output recorded here.
//
// Usage: node tools/verify-examples.mjs [--include-writes] [--only name[,name]]
//   --include-writes  also run examples marked `writes: true` (they create data in the project)
// Requires: npm start, and the widget open in a StreamBIM project.
import { writeFileSync, mkdirSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFileSync } from 'node:fs';
import { WIDGET_DOCS } from './paths.mjs';
import { methods } from '../../widget/spec/methods.mjs';
import { guides } from '../../widget/spec/guides.mjs';

const args = process.argv.slice(2);
const includeWrites = args.includes('--include-writes');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(',')) : null;
const DOCS = WIDGET_DOCS;
const date = new Date().toISOString().slice(0, 10);

export const exampleId = (owner, i) => `${owner}-${i + 1}`;

const jobs = [];
for (const m of methods) m.examples.forEach((ex, i) => jobs.push({ id: exampleId(m.name, i), owner: m.name, ex }));
for (const g of guides) {
  let n = 0;
  for (const s of g.sections) (s.examples || []).forEach((ex) => jobs.push({ id: exampleId(g.slug, n++), owner: g.slug, ex }));
}

// The example runs as written, with StreamBIM.API bound to the widget's live connection.
// Image results are downscaled to JPEG so they can be committed with the docs.
const wrap = (code) => `
const StreamBIM = { API: api };
const value = await (async () => {
${code}
})();
if (typeof value === 'string' && value.startsWith('data:image/') && value.length > 2000) {
  const img = new Image();
  img.src = value;
  await img.decode();
  const w = Math.min(720, img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = Math.round((img.naturalHeight * w) / img.naturalWidth);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}
return value;`;

const client = new Client({ name: 'verify-examples', version: '0.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL || 'http://localhost:3000/mcp')));
const call = async (name, a, timeout = 60000) => client.callTool({ name, arguments: a }, undefined, { timeout });

const status = JSON.parse((await call('streambim_status', {})).content[0].text).widgets.find((w) => w.streambimConnected);
if (!status) throw new Error('No widget connected to StreamBIM');

// Snapshot the view so it can be put back after the run.
const snapshot = JSON.parse((await call('streambim_execute_js', { code: 'return { vp: await api.getViewportState(), layers: await api.getLayers() };' })).content[0].text).result;

mkdirSync(`${DOCS}/images`, { recursive: true });
const results = {};
for (const job of jobs) {
  if (only && !only.has(job.owner)) continue;
  if (job.ex.skip) { results[job.id] = { status: 'skipped', reason: 'not executable in a side-panel widget' }; continue; }
  if (job.ex.writes && !includeWrites) { results[job.id] = { status: 'skipped', reason: 'writes to the project (run with --include-writes)' }; continue; }
  const res = await call('streambim_execute_js', { code: wrap(job.ex.code), timeoutMs: 30000 });
  const body = JSON.parse(res.content[0].text);
  const images = [];
  for (const c of res.content.slice(1)) {
    if (c.type !== 'image') continue;
    const file = `images/${job.id}.${c.mimeType.split('/')[1]}`;
    writeFileSync(`${DOCS}/${file}`, Buffer.from(c.data, 'base64'));
    images.push(file);
  }
  results[job.id] = res.isError
    ? { status: 'error', error: body.error, detail: body.detail, logs: body.logs }
    : { status: 'ok', value: body.result, logs: body.logs, images, durationMs: body.durationMs };
  console.log(results[job.id].status.padEnd(8), job.id, results[job.id].status === 'error' ? `: ${body.error}` : '');
}

await call('streambim_execute_js', {
  code: `const s = ${JSON.stringify(snapshot)};
await api.resetObjectSearch();
await api.colorCodeObjects({});
await api.setLayers(s.layers);
await api.setViewportState({ cameraState: s.vp.cameraState, hiddenObjects: s.vp.hiddenObjects, highlightedObjects: [] });
await api.setSkyColor('#a7c0e0');
return true;`,
});
await client.close();

const file = `${DOCS}/verification/examples-${date}.json`;
let previous = {};
try { previous = JSON.parse(readFileSync(file, 'utf8')).results; } catch {}
writeFileSync(file, JSON.stringify({
  verifiedAt: new Date().toISOString(),
  origin: 'https://app.streambim.com',
  projectId: status.projectId,
  buildingId: status.buildingId,
  results: { ...previous, ...results },
}, null, 2) + '\n');
const counts = Object.values(results).reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log('wrote', file, counts);
