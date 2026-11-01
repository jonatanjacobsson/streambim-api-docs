// Generates widget/{README.md, events.md, methods/*.md, guides/*.md} from the spec files
// and the latest verification runs. Example output is only ever taken from verification JSON.
//
// Usage: node tools/build-widget-docs.mjs
// Fails if an executable example has no successful verification result.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { WIDGET_DOCS } from './paths.mjs';
import { methods, categories, events } from '../../widget/spec/methods.mjs';
import { guides } from '../../widget/spec/guides.mjs';

const DOCS = WIDGET_DOCS;
const latest = (prefix) => {
  const files = readdirSync(`${DOCS}/verification`).filter((f) => f.startsWith(prefix)).sort();
  if (!files.length) throw new Error(`no ${prefix}*.json in ${DOCS}/verification`);
  return { file: files.at(-1), data: JSON.parse(readFileSync(`${DOCS}/verification/${files.at(-1)}`, 'utf8')) };
};
const examples = latest('examples-');
const probe = latest('probe-');
const sweep = latest('rest-sweep-');
const verifiedOn = examples.data.verifiedAt.slice(0, 10);

// Flavour table from the latest tools/discover-flavours.mjs run (optional).
function flavourRows() {
  let fl;
  try { fl = latest('flavours-'); } catch { return ['_Run `node harness/tools/discover-flavours.mjs` to list flavours._']; }
  const base = new Set((fl.data.flavours.find((x) => x.name === 'default') || {}).methods || []);
  const code = (s) => '`' + s + '`';
  const rows = fl.data.flavours.map((x) => {
    const m = x.methods || [];
    const extra = m.filter((n) => !base.has(n));
    const missing = [...base].filter((n) => !m.includes(n));
    let diff;
    if (x.name === 'default') diff = 'reference';
    else if (!m.length) diff = 'no widget API in this build';
    else {
      const parts = [];
      if (extra.length) parts.push('+ ' + extra.map(code).join(', '));
      if (missing.length) parts.push('− ' + (missing.length > 6 ? missing.length + ' methods (older, smaller widget API)' : missing.map(code).join(', ')));
      diff = parts.join('; ') || 'same';
    }
    return [code(x.name), m.length, x.objectCustomColours ? '✅ ' + code('colorCodeObjectsWithLegends') : '—', diff];
  });
  return [
    `Discovered ${fl.data.discoveredAt.slice(0, 10)} on ${code(fl.data.origin)} (${fl.data.probed} names probed):`,
    '',
    table(['Flavour', 'Widget methods', 'Custom colours on objects', 'Compared with default'], rows),
  ];
}

const STATUS = {
  works: '✅ works',
  partial: '🟡 partly works',
  'never-resolves': '⚠️ works, promise never resolves',
  broken: '❌ broken in production',
  missing: '🚫 not available',
  writes: '✍️ writes data',
};

// Keep personal data out of committed docs.
const scrub = (text) => text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, 'user@example.com');

function fmtOutput(value, maxLines = 60) {
  const text = scrub(typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value, null, 2) ?? 'undefined');
  const lines = text.split('\n');
  return lines.length > maxLines ? [...lines.slice(0, maxLines), `… (${lines.length - maxLines} more lines)`].join('\n') : text;
}

const missingVerification = [];
function renderExample(id, ex, depth = '../') {
  const out = [`#### ${ex.title}`, '', '```js', ex.code, '```', ''];
  const r = examples.data.results[id];
  if (ex.skip) {
    out.push('_Not executed: only runs in an embedding page, not in a side-panel widget._', '');
  } else if (!r || r.status === 'skipped') {
    out.push(`_Not executed in the last verification run${r ? ` (${r.reason})` : ''}._`, '');
    if (!ex.writes) missingVerification.push(id);
  } else if (r.status === 'error') {
    missingVerification.push(id);
    out.push(`> ❌ Failed in the last verification run: \`${r.error}\``, '');
  } else {
    out.push(`<details open><summary>Output (verified ${verifiedOn}, ${r.durationMs} ms)</summary>`, '', '```json', fmtOutput(r.value), '```');
    for (const img of r.images || []) out.push('', `![${ex.title}](${depth}${img})`);
    out.push('', '</details>', '');
  }
  return out;
}

const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// ---------------------------------------------------------------- method pages
mkdirSync(`${DOCS}/methods`, { recursive: true });
for (const m of methods) {
  const probeRows = probe.data.results.filter((r) => r.method === m.name);
  const lines = [
    `# ${m.name}`,
    '',
    `**Status:** ${STATUS[m.status]} · **Category:** ${categories.find(([k]) => k === m.category)[1]} · [All methods](../README.md)`,
    '',
    m.summary,
    '',
    '```ts',
    `StreamBIM.API.${m.signature}`,
    '```',
    '',
  ];
  if (m.params.length) lines.push('## Parameters', '', table(['Name', 'Type', 'Required', 'Description'], m.params.map((p) => [`\`${p.name}\``, `\`${cell(p.type)}\``, p.required ? 'yes' : 'no', cell(p.desc)])), '');
  lines.push('## Returns', '', `\`${m.returns.type}\`${m.returns.desc ? ': ' + m.returns.desc : ''}`, '');
  lines.push('## What StreamBIM does', '', m.host, '');
  if (m.errors.length) lines.push('## Errors', '', ...m.errors.map((e) => `- ${e}`), '');
  if (m.workaround) lines.push('## Workaround', '', m.workaround, '');
  if (m.note) lines.push('## Note', '', m.note, '');
  lines.push('## Examples', '');
  m.examples.forEach((ex, i) => lines.push(...renderExample(`${m.name}-${i + 1}`, ex)));
  if (probeRows.length) {
    lines.push(`## Probe results (${probe.data.probedAt.slice(0, 10)})`, '', 'Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:', '');
    lines.push(table(['Case', 'Args', 'Outcome', 'ms'], probeRows.map((r) => [
      cell(r.note || 'normal call'),
      `\`${cell(scrub(JSON.stringify(r.args)).slice(0, 80))}\``,
      r.status === 'resolved' ? `resolved \`${r.type}\`` : r.status === 'rejected' ? `rejected \`${cell(scrub(JSON.stringify(r.error.value ?? r.error.message)).slice(0, 120))}\`` : '**never settled**',
      r.ms,
    ])), '');
  }
  writeFileSync(`${DOCS}/methods/${m.name}.md`, lines.join('\n'));
}

// ---------------------------------------------------------------- guides
mkdirSync(`${DOCS}/guides`, { recursive: true });
for (const g of guides) {
  const lines = [`# ${g.title}`, '', `[Widget API docs](../README.md)`, '', g.intro, ''];
  let n = 0;
  for (const s of g.sections) {
    lines.push(`## ${s.heading}`, '');
    if (s.text) lines.push(s.text, '');
    for (const ex of s.examples || []) lines.push(...renderExample(`${g.slug}-${++n}`, ex));
  }
  if (g.restSweep) {
    lines.push(`## Endpoint compatibility (swept ${sweep.data.sweptAt.slice(0, 10)})`, '',
      'Every read-only GET below was called from the widget with the default Accept (`application/vnd.api+json`) and with `application/json`. `n` is the number of records returned. Generated by `harness/tools/sweep-rest.mjs`.', '');
    const fmt = (x) => (x.ok ? `✅${x.count != null ? ` n=${x.count}` : ''}` : '❌');
    lines.push(table(['Endpoint', 'default Accept', 'application/json', 'Returns'], sweep.data.results.map((r) => {
      const ok = r.jsonapi.ok ? r.jsonapi : r.json;
      return [`\`${r.template}\``, fmt(r.jsonapi), fmt(r.json), ok.ok ? cell(ok.firstType ? `\`${ok.firstType}\`` : ok.json ? `keys: ${(Array.isArray(ok.topKeys) ? ok.topKeys : []).join(', ')}` : 'text') : ''];
    })), '');
    lines.push('Notes from the sweep:', '',
      '- `page[limit]` is ignored by some list endpoints (e.g. `/mgw/api/v3/projects`, `/v2/checklists`), which return everything.',
      '- `/v2/attachments` and `/v2/document-revisions` need filters (e.g. `filter[object]` + `filter[building]`).',
      '- `/api/v1/ping` and `/cmv3/converter-jobs` failed from the widget.', '');
  }
  writeFileSync(`${DOCS}/guides/${g.slug}.md`, lines.join('\n'));
}

// ---------------------------------------------------------------- events
writeFileSync(`${DOCS}/events.md`, [
  '# Widget events (callbacks)',
  '',
  '[Widget API docs](README.md)',
  '',
  'StreamBIM calls these functions on your widget. Pass them in the `methods` object when you connect. StreamBIM only calls names you provided (`hasHandlerFor`). Calls made while the widget is closed are queued and delivered when it reconnects (`pendingActions`).',
  '',
  table(['Event', 'Payload', 'When'], events.map((e) => [`\`${e.name}\``, `\`${cell(e.payload)}\``, cell(e.when)])),
  '',
  '## Observed payloads',
  '',
  ...events.filter((e) => e.observed).flatMap((e) => [`### ${e.name}`, '', '```json', fmtOutput(e.observed), '```', '']),
  '## Example',
  '',
  'From the harness widget (`widget/widget.js`), which forwards every event to MCP clients:',
  '',
  '```js',
  'const callbacks = {',
  "  pickedObject: (r) => console.log('picked', r.guid, r.point, r.shiftKey),",
  "  spacesChanged: (guids) => console.log(guids.length ? 'in space ' + guids[0] : 'outside spaces'),",
  "  floorChanged: (floorId) => console.log('floor', floorId),",
  '  cameraChanged: throttle((cam) => save(cam), 500), // fires continuously while moving',
  "  didExpand: () => document.body.classList.add('expanded'),",
  "  didContract: () => document.body.classList.remove('expanded'),",
  "  modelReady: () => console.log('model ready'),",
  '};',
  '```',
  '',
].join('\n'));

// ---------------------------------------------------------------- index
const byStatus = methods.reduce((a, m) => ((a[m.status] = (a[m.status] || 0) + 1), a), {});
const okCount = Object.values(examples.data.results).filter((r) => r.status === 'ok').length;
const index = [
  '# StreamBIM Widget API: verified reference',
  '',
  `Every method the StreamBIM web app exposes to widgets, documented one page each. Each page shows what StreamBIM actually does when the method is called (read from the production bundle), the errors it really returns, and examples that were **executed against a live viewer** with their real output.`,
  '',
  `- Verified: ${verifiedOn} on \`${examples.data.origin}\`, project ${examples.data.projectId}, building ${examples.data.buildingId}`,
  `- ${okCount} examples run successfully. ${methods.length} methods: ${Object.entries(byStatus).map(([k, v]) => `${v} ${STATUS[k]}`).join(', ')}`,
  '- Generated by `harness/tools/build-widget-docs.mjs` (`npm run build-docs`) from `spec/*.mjs` and `verification/*.json`. Don\'t edit the generated pages by hand.',
  '',
  '## Start here',
  '',
  '- [Connecting a widget](#connecting-a-widget)',
  '- [Calling the REST API from a widget](guides/rest-api-from-widgets.md)',
  '- [Annotations (custom IFC objects)](guides/annotations-custom-objects.md)',
  '- [Checklists from a widget, and colouring objects by checklist values](guides/checklists-and-colour-by-value.md)',
  '- [Events / callbacks](events.md)',
  '',
  '## Connecting a widget',
  '',
  'A widget is a page StreamBIM loads in an iframe in the side panel. StreamBIM connects to it with [penpal](https://github.com/Aaronius/penpal) v7. The method table on this page is what you get back.',
  '',
  'The official `streambim-widget-api` v3 helper `connectToParent(window, methods)` **failed** in this setup. It builds its allowed origin from `document.referrer`, which is empty inside StreamBIM, so it throws `Invalid URL`. Passing `window` would also point penpal at the widget itself. The verified approach talks penpal directly (`penpal.min.js` from the `penpal@7` package):',
  '',
  '```html',
  '<script src="penpal.min.js"></script>',
  '<script>',
  '  const messenger = new Penpal.WindowMessenger({',
  '    remoteWindow: window.parent,',
  "    allowedOrigins: [location.ancestorOrigins?.[0] || /^https:\\/\\/([a-z0-9-]+\\.)?streambim\\.com$/],",
  '  });',
  '  const connection = Penpal.connect({ messenger, methods: callbacks, timeout: 20000 });',
  '  connection.promise.then((api) => {',
  '    window.StreamBIM = { API: api }; // same shape the examples use',
  '    return StreamBIM.API.getProjectId();',
  '  }).then((id) => console.log("connected to project", id));',
  '</script>',
  '```',
  '',
  'This is the code running in the verification harness (`widget/widget.js`, `connectStreamBIM`).',
  '',
  '## Flavours',
  '',
  'The webapp is served in several builds ("flavours") at `/webapp/<flavour>/`. Each project has a home flavour in its `project-uri` attribute (all 65 projects of the test account use `default`), and the app redirects there unless the URL hash contains `forceFlavor=true`. To open another flavour use `https://app.streambim.com/webapp/<flavour>/#/viewer/...&forceFlavor=true`, with the flag **after** the `#`. There is no listing endpoint: `harness/tools/discover-flavours.mjs` probes names (unknown ones answer 404) and compares the widget API in each build.',
  '',
  ...flavourRows(),
  '',
  '## Error format',
  '',
  'Most rejections are `{ code, debug }`, not `{ code, detail }` as the official README says:',
  '',
  '| `code` | Meaning |',
  '|---|---|',
  '| `invalid` | Argument failed validation. GUIDs must be strings of exactly 22 characters |',
  '| `notFound` / `unauthorized` / `notAllowed` | Backend 404 / 401 / 403 (`debug` has the server message) |',
  '| `unknown` | Anything else, including exceptions inside StreamBIM (`debug: { error, stack }`) |',
  '',
  'Exceptions: `quickSearch` and `valuesForObjectProperty` reject with a bare string, `getObjectInfoForSearch` rejects with `{ status: 400, detail }`, `makeApiRequest` HTTP errors arrive as a `DataCloneError`, and unknown methods reject with `PenpalError: Method \\`x\\` is not found.`',
  '',
  '## Methods',
  '',
  ...categories.flatMap(([key, label]) => {
    const list = methods.filter((m) => m.category === key);
    return [`### ${label}`, '', table(['Method', 'Status', 'Summary'], list.map((m) => [`[\`${m.name}\`](methods/${m.name}.md)`, STATUS[m.status], cell(m.summary)])), ''];
  }),
  '## Corrections to the official README',
  '',
  '- Not exposed by the default webapp: `highlightSystem`, `toggleShowAllFloors`, `applyViewpoint`, `colorCodeObjectsWithLegends`, `colorCodeSpacesWithLegends`, `setViewLayout`, `clipToFloor`. All but `toggleShowAllFloors` exist in the `taskctrl` flavour (`/webapp/taskctrl/#/viewer/...&forceFlavor=true`, with the flag after the `#`).',
  '- Never resolve (await hangs forever): `setCameraPosition`, `deHighlightAllObjects`, `applyStyles`. `getMapImage` did not settle in the default 3D layout.',
  '- Broken: `deHighlightObject` always rejects (`deSelectObject is not a function`). `colorCodeObjects` ignores the colours (objects show in search green). `colorCodeSpaces` **does** render custom GUID → colour maps, and `colorCodeByProperty` renders the viewer palette. Objects take custom colours in the `taskctrl` flavour via `colorCodeObjectsWithLegends`.',
  '- `applyObjectSearch` resolves `true` and has no `replace` argument. `valuesForObjectProperty` returns `{ value: count }`. `getAnnotatedFloorplan` returns an https URL with a microtoken. `getSpaces` returns only the spaces the camera is inside.',
  '- Undocumented: `applyStyles`, `goHome(resetCamera)`, `setViewportState({ highlightedLayer })`, the `pickedObject.shiftKey` field, the `modelReady` event.',
  '- `createObject` stores the centre as `[x, z, -y]` and creates a persistent `Annotation`.',
  '- `beforeInit` is only called in embedded (`connectToChild`) mode.',
  '',
  '## Re-verifying',
  '',
  '```bash',
  'cd harness && npm install && npm start          # widget + MCP on :3000',
  '# open the project with the "localhost" widget in Chrome, then:',
  'node tools/probe-widget-api.mjs                 # raw behaviour of every method',
  'npm run verify                                  # run every example (add -- --include-writes for writes)',
  'node tools/sweep-rest.mjs                       # REST endpoint compatibility',
  'npm run build-docs                              # regenerate these pages',
  '```',
  '',
  'To check the method table against a new StreamBIM release, download the `rendrao-*.js` bundle listed in `[...document.scripts]` on a viewer page and run `node harness/tools/extract-widget-methods.mjs <bundle> out.js`.',
  '',
].join('\n');
writeFileSync(`${DOCS}/README.md`, index);

if (missingVerification.length) {
  console.error('Examples without a successful verification run:', missingVerification.join(', '));
  process.exitCode = 1;
}
console.log(`built ${methods.length} method pages, ${guides.length} guides, events.md, README.md (examples from ${examples.file})`);
