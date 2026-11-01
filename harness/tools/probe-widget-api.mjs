// Calls every StreamBIM widget API method against the live viewer (through the running MCP
// server and widget) and records what actually happens: resolve / reject / never settles,
// return type and shape, error shape, duration.
//
// Usage: node tools/probe-widget-api.mjs [--include-writes] [--out file.json]
//   --include-writes  also calls createObject (persists an Annotation in the project)
// Requires: server running (npm start) and the widget open in a StreamBIM project.
import { writeFileSync, mkdirSync } from 'node:fs';
import { VERIFICATION } from './paths.mjs';
import { dirname } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const args = process.argv.slice(2);
const includeWrites = args.includes('--include-writes');
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : `${VERIFICATION}/probe-${new Date().toISOString().slice(0, 10)}.json`;

// Runs inside the widget. `api`, `ctx`, `sleep` are provided by streambim_execute_js.
const PROBE = String.raw`
const SETTLE_MS = 6000;
const shape = (v, depth = 0) => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1), '…×' + v.length] : [];
  if (typeof v === 'object') {
    if (depth > 3) return 'object';
    return Object.fromEntries(Object.keys(v).slice(0, 25).map((k) => [k, shape(v[k], depth + 1)]));
  }
  if (typeof v === 'string' && v.startsWith('data:')) return 'string(dataURL ' + v.slice(5, v.indexOf(';')) + ', ' + v.length + ' chars)';
  return typeof v;
};
const sample = (v) => {
  if (typeof v === 'string' && v.startsWith('data:')) return v.slice(0, 40) + '…';
  const t = JSON.stringify(v);
  return t && t.length > 1500 ? JSON.parse(JSON.stringify(t.slice(0, 1500) + '…')) : v;
};
const errInfo = (e) => {
  if (e instanceof Error) return { kind: 'Error', name: e.name, message: e.message };
  if (e && typeof e === 'object') return { kind: 'object', keys: Object.keys(e), value: sample(e) };
  return { kind: typeof e, value: e };
};
async function probe(method, argList, note) {
  const t0 = performance.now();
  let timer;
  const settle = new Promise((r) => { timer = setTimeout(() => r({ status: 'never-settled' }), SETTLE_MS); });
  const call = (async () => api[method](...argList))().then(
    (v) => ({ status: 'resolved', type: v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v, shape: shape(v), sample: sample(v) }),
    (e) => ({ status: 'rejected', error: errInfo(e) }),
  );
  const res = await Promise.race([call, settle]);
  clearTimeout(timer);
  return { method, args: sample(argList), note, ms: Math.round(performance.now() - t0), ...res };
}

const results = [];
const run = async (m, a = [], note) => { const r = await probe(m, a, note); results.push(r); return r; };

// --- fixtures from the live model
const door = (await api.findObjects({ key: '@kind', value: 'Door', limit: 5 }))[0];
const spaces = await api.findObjects({ key: '@kind', value: 'Space', limit: 5 }).catch(() => []);
const space = spaces[0];
const floors = await api.getFloors();
const cam = await api.getCameraState();
const vp = await api.getViewportState();
const layers = await api.getLayers();
const fixtures = { door, space, floorId: floors[0] && floors[0].id, camera: cam };

// --- read-only
for (const m of ['getProjectId', 'getBuildingId', 'getUserEmail', 'getCameraState', 'getFloors', 'getSpaces', 'getViewportState', 'getLayers']) await run(m);
await run('getObjectInfo', [door]);
await run('getObjectInfo', ['not-a-guid'], 'invalid GUID');
await run('getObjectInfo', ['0000000000000000000000'], 'well-formed but unknown GUID');
await run('findObjects', [{ key: '@kind', value: 'Door', limit: 3 }]);
await run('findObjects', [{ rules: [[{ buildingId: ctx.buildingId, propKey: '@kind', propValue: 'Window' }]], limit: 3 }], 'rules form');
await run('getObjectInfoForSearch', [{ filter: { key: '@kind', value: 'Door' }, page: { limit: 2, skip: 0 }, sort: { field: 'Name', descending: false } }]);
await run('getObjectInfoForSearch', [{ page: { limit: 2 } }], 'no filter');
await run('quickSearch', ['Door']);
await run('quickSearch', [''], 'empty text');
await run('valuesForObjectProperty', ['Name']);
await run('valuesForObjectProperty', ['@kind']);
await run('takeScreenshot');
await run('getMapImage', [{ width: 300, height: 200, resolution: 0.5 }]);
await run('getAnnotatedFloorplan', [cam.position]);
await run('makeApiRequest', [{ url: '/mgw/api/v3/projects/' + ctx.projectId }]);
await run('makeApiRequest', [{ url: '/project-' + ctx.projectId + '/api/v1/does-not-exist' }], 'HTTP error');

// --- view state (restored afterwards)
await run('setCameraState', [cam]);
await run('setCameraState', [{ position: [0, 0] }], 'invalid state');
await run('setCameraPosition', [cam.position]);
await run('setCameraPosition', [[1, 2]], 'invalid position');
await run('setViewportState', [vp]);
await run('setViewportState', [{ hiddenObjects: ['short'] }], 'invalid GUID in hiddenObjects');
await run('highlightObject', [door]);
await run('deHighlightObject', [door]);
await run('highlightObject', ['bad'], 'invalid GUID');
await run('deHighlightAllObjects');
await run('hideObject', [door]);
await run('hideObject', [door], 'already hidden');
await run('showObject', [door]);
await run('showAllObjects');
await run('applyObjectSearch', [{ key: '@kind', value: 'Door' }]);
await run('setSearchVisualizationMode', ['FADED']);
await run('setSearchVisualizationMode', ['NOT_A_MODE'], 'unknown mode');
await run('zoomToSearchResult');
await run('resetObjectSearch');
await run('colorCodeObjects', [{ [door]: '#ff0000' }]);
await run('colorCodeObjects', [{}], 'clear');
if (space) { await run('colorCodeSpaces', [{ [space]: '#00ff00' }]); await run('colorCodeSpaces', [{}], 'clear'); }
await run('colorCodeByProperty', [{ propertyKey: '@kind' }]);
await run('resetObjectSearch', [], 'after colorCodeByProperty');
await run('setLayers', [layers]);
await run('showGrids');
await run('hideGrids');
await run('setSkyColor', ['#dde7f3']);
await run('setNavigationMode', [1]);
await run('setStyles', ['/* probe */']);
await run('applyStyles', ['/* probe */'], 'undocumented alias');
await run('setShowExpandButton', [true]);
await run('setExpanded', [false]);
await run('gotoObject', [door]);
if (space) await run('gotoSpace', [space]);
await run('gotoFloor', [fixtures.floorId]);
await run('goHome', []);
await run('setCameraState', [cam], 'restore camera');

// --- documented elsewhere but not in the host method table
for (const m of ['highlightSystem', 'toggleShowAllFloors', 'applyViewpoint', 'colorCodeObjectsWithLegends', 'colorCodeSpacesWithLegends', 'setViewLayout', 'clipToFloor']) await run(m, [door], 'expected missing');

// --- writes
if (INCLUDE_WRITES) await run('createObject', [{ center: cam.position, name: 'probe annotation' }], 'persists an Annotation');

return { fixtures, results };
`.replace('INCLUDE_WRITES', String(includeWrites));

const client = new Client({ name: 'probe', version: '0.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL || 'http://localhost:3000/mcp')));
const status = JSON.parse((await client.callTool({ name: 'streambim_status', arguments: {} })).content[0].text);
const res = await client.callTool({ name: 'streambim_execute_js', arguments: { code: PROBE, timeoutMs: 290000 } }, undefined, { timeout: 300000 });
await client.close();

const body = JSON.parse(res.content[0].text);
if (res.isError) throw new Error(JSON.stringify(body, null, 2));
const widget = status.widgets.find((w) => w.streambimConnected) || {};
const report = {
  probedAt: new Date().toISOString(),
  origin: widget.referrer || 'https://app.streambim.com',
  projectId: widget.projectId,
  buildingId: widget.buildingId,
  ...body.result,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
const counts = report.results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log(`wrote ${out}:`, counts);
for (const r of report.results) console.log(r.status.padEnd(14), String(r.ms).padStart(5), 'ms ', r.method, r.note ? `(${r.note})` : '');
