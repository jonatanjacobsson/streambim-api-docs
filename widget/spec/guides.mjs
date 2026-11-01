// Task guides rendered to docs/widget/guides/*.md. Same rules as methods.mjs: every example is
// executed in the live widget by harness/tools/verify-examples.mjs and the docs show its real output.

const REST_HELPER = `// Reusable helper: JSON-parses responses and turns the opaque clone error into a clear one.
async function sbRequest(path, { method = 'GET', body, accept, contentType } = {}) {
  const opts = { url: path, method };
  if (body !== undefined) opts.body = body;
  if (accept) opts.accept = accept;
  if (contentType) opts.contentType = contentType;
  let text;
  try {
    text = await StreamBIM.API.makeApiRequest(opts);
  } catch (err) {
    if (/could not be cloned/.test(err && err.message)) throw new Error(method + ' ' + path + ' failed (HTTP error; status not exposed to widgets)');
    throw err;
  }
  try { return JSON.parse(text); } catch { return text; }
}`;

// JSON:API helper for project endpoints, used by the checklist examples. Handles the two
// makeApiRequest quirks found in testing: 201 Created is reported as a DataCloneError, and
// GETs can be served from cache right after a write.
const JSONAPI = `const projectId = await StreamBIM.API.getProjectId();
const buildingId = await StreamBIM.API.getBuildingId();
const v2 = '/project-' + projectId + '/api/v1/v2/';
const isCloneError = (err) => /could not be cloned/.test(err && err.message);
async function get(path) {
  const sep = path.includes('?') ? '&' : '?';
  return JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + path + sep + '_=' + Date.now() })).data;
}
// POST, then find the new record: the 201 response never reaches the widget.
async function create(type, attributes, relationships, find) {
  try {
    await StreamBIM.API.makeApiRequest({ url: v2 + type, method: 'POST', body: { data: { type, attributes, relationships } } });
  } catch (err) {
    if (!isCloneError(err)) throw err;
  }
  const record = await find();
  if (!record) throw new Error('POST ' + type + ' failed');
  return record;
}
// PATCH with the full current record: partial PATCHes were not applied.
async function patch(type, id, changes = {}, relChanges = {}) {
  const cur = await get(type + '/' + id);
  const body = { data: { id, type, attributes: { ...cur.attributes, ...changes }, relationships: { ...cur.relationships, ...relChanges } } };
  return JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + type + '/' + id, method: 'PATCH', body })).data;
}
const newest = (list) => list.sort((a, b) => Number(b.id) - Number(a.id))[0];`;

// Shared by the custom-object examples (run before each one, shown once on the page).
const OBJ = `const projectId = await StreamBIM.API.getProjectId();
const buildingId = await StreamBIM.API.getBuildingId();
const objects = '/project-' + projectId + '/api/v1/v2/ifc-objects';
const url = (id) => objects + '/' + encodeURIComponent(id) + '?building=' + buildingId;
const get = async (id) => JSON.parse(await StreamBIM.API.makeApiRequest({ url: url(id) + '&_=' + Date.now() })).data;
const exists = async (id) => { try { await get(id); return true; } catch (err) { return false; } };
const SERVER_PROPS = ['Global Id', '@Building Storey', '@Group Layer', '@Document Id', '@Building Id', 'Timestamp', 'groups', 'BaseType', 'uri'];
const SERVER_GROUPS = ['Location', 'Geometry', 'Custom'];
// One property in a property set. The server keeps the JSON type of value (see Property sets).
const prop = (key, value, measure = '', unit = '') =>
  ({ key, value, valueType: typeof value === 'number' ? 'float8' : typeof value === 'boolean' ? 'bool' : 'str', measure, unit, valueItem: '' });
const typed = (p) => p.valueType === 'float8' || p.valueType === 'int64' ? Number(p.value) : p.valueType === 'bool' ? p.value === 'true' : p.value;
// Full-record PATCH. change(attributes) edits name, groups or geometry in place.
async function save(id, change) {
  const cur = await get(id);
  const a = cur.attributes;
  const attributes = {
    layer: null,
    properties: Object.fromEntries(Object.entries(a.properties).filter(([k]) => !SERVER_PROPS.includes(k))),
    groups: a.groups.filter((g) => !SERVER_GROUPS.includes(g.label))
      .map((g) => ({ label: g.label, content: { properties: g.content.properties.map((p) => prop(p.key, typed(p), p.measure, p.unit)) } })),
    center: a.center, bbox: a.bbox, boundary: a.boundary,
  };
  change(attributes);
  const relationships = { building: cur.relationships.building, floors: cur.relationships.floors };
  return JSON.parse(await StreamBIM.API.makeApiRequest({ url: url(id), method: 'PATCH', body: { data: { id, type: 'ifc-objects', attributes, relationships } } })).data;
}
// The request the Add zone editor sends. outline is [x1, y1, x2, y2, ...] in metres.
async function createZone({ name, floorId, outline, bottom, top, groups = [] }) {
  const xs = outline.filter((v, i) => i % 2 === 0), ys = outline.filter((v, i) => i % 2 === 1);
  const bbox = [Math.min(...xs), Math.min(...ys), bottom, Math.max(...xs), Math.max(...ys), top];
  const attributes = { layer: null, properties: { Name: name, 'Long Name': '', '@kind': 'Space', Description: '' }, groups,
    boundary: outline, bbox, center: [(bbox[0] + bbox[3]) / 2, (bbox[1] + bbox[4]) / 2, (bottom + top) / 2] };
  const relationships = { building: { data: { type: 'buildings', id: String(buildingId) } }, floors: { data: [{ type: 'floors', id: String(floorId) }] } };
  return JSON.parse(await StreamBIM.API.makeApiRequest({ url: objects, method: 'POST', body: { data: { type: 'ifc-objects', attributes, relationships } } })).data;
}
const remove = async (id) => (await StreamBIM.API.makeApiRequest({ url: url(id), method: 'DELETE' })).trim();
const groupsOf = (record) => record.attributes.groups.filter((g) => g.label !== 'Custom')
  .map((g) => ({ label: g.label, values: Object.fromEntries(g.content.properties.map((p) => [p.key, p.value + ' : ' + p.valueType])) }));`;

const DEMO_CHECKLIST = 'Widget demo: door inspection';

export const guides = [
  {
    slug: 'checklists-and-colour-by-value',
    title: 'Checklists from a widget, and colouring objects by checklist values',
    intro: `StreamBIM checklists attach questions (checklist items) to model objects. Every object × item pair is a **checklist item instance** that holds the answer. Through \`makeApiRequest\` a widget can read all of it, and also create checklists and fill in answers.

**What StreamBIM can't do today:** colour the model by the *value* of a checklist item. The viewer's own checklist colouring is by status only (\`done\` / \`mixed\` / \`open\`). This guide shows how a widget can do it: read the values, group the objects per value, give each value a colour and a legend, and let the user isolate one value at a time.

> Where custom colours render (verified 2026-11-01):

| Target | Default flavour (\`/webapp/default/\`) | \`taskctrl\` flavour (\`/webapp/taskctrl/#/…&forceFlavor=true\`) |
|---|---|---|
| Spaces | ✅ \`colorCodeSpaces(guid → colour)\` | ✅ also \`colorCodeSpacesWithLegends\` |
| Other objects | ❌ \`colorCodeObjects\` draws search green | ✅ \`colorCodeObjectsWithLegends({ data, legends })\`, with StreamBIM's own legend |

So a space-based checklist gets real colours everywhere. An object checklist (like the doors here) gets real colours in taskctrl. In default it gets the legend and per-value isolation recipe below.

Examples marked as writing data were run on the demo project (\`--include-writes\`). The others read the demo checklist "${DEMO_CHECKLIST}" (20 doors, one single-select item "Status" with options OK / Deviation / Not inspected).`,
    sections: [
      {
        heading: 'Data model',
        text: `| JSON:API type (\`/project-{id}/api/v1/v2/…\`) | What | Key fields |
|---|---|---|
| \`checklists\` | The checklist | \`name\`, \`is-draft\`, \`group-by\` (\`""\` = per object; \`"space"\`, \`"floor"\`, \`"TAKT~Navn"\`… = grouped); relationships \`ifc-query\` (which objects get it), \`workflow\` (permissions + statuses), \`checklist-items\`, \`buildings\` |
| \`checklist-items\` | A question | \`title\`, \`input-type\` (\`checkbox\`, \`text\`, \`singleselect\`, …), \`order\`, \`is-draft\`; relationship \`item-options\` |
| \`checklist-options\` | A choice for select items | \`name\`. The instance stores the option **id** |
| \`checklist-item-instances\` | The answer for one object | \`options\` (option id for select items), \`option-number\`, \`option-date\`, \`title\` (object name); relationships \`object\` (\`ifc-light-objects\`, the GUID), \`checklist-item\`, \`checklist\`, \`status\` |
| \`ifc-queries\` | Saved search defining the objects | \`rules\` (same shape as \`ifc-searches\`), \`search-id\` |
| \`workflows\` (type \`checklist\`) | Who can see / fill / sign | statuses \`open\` (2000), \`done\` (3000), \`closed\` (4000), \`notRelevant\` (4500) |

Instances are **created by the server** when the checklist's \`ifc-query\` (with a \`search-id\`) matches objects. You don't POST them (POST answers 500). You PATCH the generated ones.`,
      },
      {
        heading: 'Read checklists, items and options',
        examples: [{ title: 'The demo checklist, its item and options', code: `${JSONAPI}\n\nconst checklist = newest((await get('checklists')).filter((c) => c.attributes.name === '${DEMO_CHECKLIST}'));\nconst items = await get('checklist-items?filter[checklist]=' + checklist.id);\nconst options = Object.fromEntries((await get('checklist-options')).map((o) => [o.id, o.attributes.name]));\nreturn {\n  checklist: { id: checklist.id, name: checklist.attributes.name, instancesTotal: checklist.attributes['instances-total'], query: checklist.relationships['ifc-query'].data },\n  items: items.map((i) => ({ id: i.id, title: i.attributes.title, inputType: i.attributes['input-type'], options: i.relationships['item-options'].data.map((o) => options[o.id]) })),\n};` }],
      },
      {
        heading: 'Create a checklist and assign it to objects (API only)',
        text: `The order matters:

1. \`POST /ifc-searches\` with the rules → \`searchId\`.
2. \`POST /v2/ifc-queries\` with \`rules\` **and** \`search-id\`. Without \`search-id\` no instances are generated.
3. \`POST /v2/checklists\` (draft), then options, then items.
4. Full-record \`PATCH\` of the checklist to set \`ifc-query\`. The server then creates one instance per object × item, and gives the checklist its own \`checklist\` workflow if you didn't pass one.
5. A second \`PATCH\` with \`is-draft: false\` to publish.

Every POST answers 201, which the widget sees as a \`DataCloneError\`. The \`create()\` helper ignores that and finds the new record by a unique value. This example deletes what it created at the end.`,
        examples: [{ title: 'Create, assign to windows, check instances, delete', writes: true, code: `${JSONAPI}\n\nconst rules = [[{ propKey: '@kind', propValue: 'Window', buildingId }]];\nconst { searchId } = JSON.parse(await StreamBIM.API.makeApiRequest({ url: '/project-' + projectId + '/api/v1/ifc-searches', method: 'POST', contentType: 'application/json', body: { rules } }));\nconst query = await create('ifc-queries', { name: '', rules, 'search-id': searchId }, undefined,\n  async () => newest((await get('ifc-queries')).filter((q) => q.attributes['search-id'] === searchId)));\n\nconst name = 'Widget API test ' + Date.now();\nconst checklist = await create('checklists', { name, 'group-by': '', 'is-draft': true }, {\n  buildings: { data: [{ id: buildingId, type: 'buildings' }] },\n}, async () => (await get('checklists')).find((c) => c.attributes.name === name));\n\nconst option = await create('checklist-options', { name: name + ' / OK' }, undefined,\n  async () => (await get('checklist-options')).find((o) => o.attributes.name === name + ' / OK'));\nconst item = await create('checklist-items', { title: 'Checked', 'input-type': 'singleselect', 'item-type': 'item', order: 0, 'is-draft': false }, {\n  checklist: { data: { id: checklist.id, type: 'checklists' } },\n  'item-options': { data: [{ id: option.id, type: 'checklist-options' }] },\n}, async () => (await get('checklist-items?filter[checklist]=' + checklist.id))[0]);\n\nawait patch('checklists', checklist.id, {}, { 'ifc-query': { data: { id: query.id, type: 'ifc-queries' } } }); // assign\nawait patch('checklists', checklist.id, { 'is-draft': false }); // publish\nconst after = await get('checklists/' + checklist.id);\nconst instances = await get('checklist-item-instances?page[limit]=500&filter[checklist]=' + checklist.id);\n\nlet deleted;\ntry {\n  await StreamBIM.API.makeApiRequest({ url: v2 + 'checklists/' + checklist.id, method: 'DELETE' });\n  deleted = 'ok';\n} catch (err) {\n  deleted = isCloneError(err) ? 'ok (204, reported as clone error)' : err.message;\n}\nconst stillListed = (await get('checklists')).some((c) => c.id === checklist.id);\n// DELETE answers 204 for these, which also arrives as a clone error.\nfor (const path of ['checklist-options/' + option.id, 'ifc-queries/' + query.id]) {\n  await StreamBIM.API.makeApiRequest({ url: v2 + path, method: 'DELETE' }).catch((err) => { if (!isCloneError(err)) throw err; });\n}\nreturn { queryId: query.id, checklistId: checklist.id, itemId: item.id, workflow: after.relationships.workflow.data, isDraft: after.attributes['is-draft'], instancesTotal: after.attributes['instances-total'], instancesListed: instances.length, deleted, stillListed };` }],
      },
      {
        heading: 'Fill in answers',
        text: 'PATCH each generated instance with the option id (full record, see the helper). Here the answers are set deterministically so the colour example below has three groups.',
        examples: [{ title: 'Answer the demo checklist for all 20 doors', writes: true, code: `${JSONAPI}\n\nconst checklist = newest((await get('checklists')).filter((c) => c.attributes.name === '${DEMO_CHECKLIST}'));\nconst [item] = await get('checklist-items?filter[checklist]=' + checklist.id);\nconst optionIds = Object.fromEntries((await get('checklist-options')).filter((o) => item.relationships['item-options'].data.some((x) => x.id === o.id)).map((o) => [o.attributes.name, o.id]));\nconst instances = await get('checklist-item-instances?page[limit]=500&filter[checklist]=' + checklist.id);\nconst answer = (i) => (i % 5 === 0 ? 'Deviation' : i % 7 === 0 ? 'Not inspected' : 'OK');\nconst written = {};\nfor (const [i, inst] of instances.entries()) {\n  const saved = await patch('checklist-item-instances', inst.id, { options: optionIds[answer(i)] });\n  written[saved.attributes.options] = (written[saved.attributes.options] || 0) + 1;\n}\nreturn { optionIds, instances: instances.length, writtenPerOptionId: written };` }],
      },
      {
        heading: 'Read answers per object',
        text: 'The checklist export gives one row per object with every item\'s answer (`"<order>. <title>": <option id>`). It needs a base64 `query` parameter.',
        examples: [{ title: 'Export answers', code: `const projectId = await StreamBIM.API.getProjectId();\nconst v2 = '/project-' + projectId + '/api/v1/v2/';\nconst checklists = JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + 'checklists' })).data;\nconst checklist = checklists.filter((c) => c.attributes.name === '${DEMO_CHECKLIST}').sort((a, b) => b.id - a.id)[0];\nconst query = { key: 'object', sort: { field: 'title', descending: false }, page: { skip: 0, limit: 10000 }, filter: { checklist: checklist.id }, timeZone: 'Europe/Stockholm', format: 'json', filename: '' };\nconst res = JSON.parse(await StreamBIM.API.makeApiRequest({\n  url: '/project-' + projectId + '/api/v1/checklists/export/json/?query=' + encodeURIComponent(btoa(JSON.stringify(query))),\n  accept: 'application/json',\n}));\nreturn { total: res.meta.total, first: res.data.slice(0, 2) };` }],
      },
      {
        heading: 'Colour by checklist item value (widget recipe)',
        text: `The coordinated flow a widget can run:

1. Load the checklist item and its options, to map option id to name.
2. Export the answers and group object GUIDs per value.
3. Give each value a colour, call \`colorCodeObjects\` with the full map, and draw a legend with counts in the widget.
4. On a legend click, call \`colorCodeObjects\` with only that value's objects. This isolates them (other objects follow the search visualization mode) and zooms to them.`,
        examples: [
          { title: 'Build the colour map and legend', code: `const projectId = await StreamBIM.API.getProjectId();\nconst v2 = '/project-' + projectId + '/api/v1/v2/';\nconst getJson = async (url, accept) => JSON.parse(await StreamBIM.API.makeApiRequest(accept ? { url, accept } : { url }));\n\nasync function checklistValueGroups(checklistName, itemTitle) {\n  const checklist = (await getJson(v2 + 'checklists')).data.filter((c) => c.attributes.name === checklistName).sort((a, b) => b.id - a.id)[0];\n  const item = (await getJson(v2 + 'checklist-items?filter[checklist]=' + checklist.id)).data.find((i) => i.attributes.title === itemTitle);\n  const optionName = Object.fromEntries((await getJson(v2 + 'checklist-options')).data.map((o) => [o.id, o.attributes.name]));\n  const query = { key: 'object', page: { skip: 0, limit: 10000 }, sort: { field: 'title', descending: false }, filter: { checklist: checklist.id }, format: 'json', filename: '' };\n  const rows = (await getJson('/project-' + projectId + '/api/v1/checklists/export/json/?query=' + encodeURIComponent(btoa(JSON.stringify(query))), 'application/json')).data;\n  const column = item.attributes.order + 1 + '. ' + item.attributes.title;\n  const groups = {};\n  for (const row of rows) {\n    const raw = row.items[column];\n    const value = raw ? optionName[raw] || raw : 'No answer';\n    (groups[value] = groups[value] || []).push(row.object);\n  }\n  return groups;\n}\n\nconst PALETTE = { OK: '#30a46c', Deviation: '#e5484d', 'Not inspected': '#f5d90a', 'No answer': '#8b8d98' };\nconst groups = await checklistValueGroups('${DEMO_CHECKLIST}', 'Status');\nconst colors = {};\nfor (const [value, guids] of Object.entries(groups)) for (const g of guids) colors[g] = PALETTE[value] || '#3e63dd';\nawait StreamBIM.API.colorCodeObjects(colors);\n\n// Legend in the widget page; click a row to isolate that value.\nconst legend = document.querySelector('#checklist-legend') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'checklist-legend' }));\nlegend.innerHTML = Object.entries(groups).map(([value, guids]) =>\n  '<button data-value="' + value + '" style="display:flex;gap:8px;align-items:center;width:100%;margin:2px 0">' +\n  '<span style="width:12px;height:12px;border-radius:3px;background:' + (PALETTE[value] || '#3e63dd') + '"></span>' + value + ' <b style="margin-left:auto">' + guids.length + '</b></button>').join('');\nlegend.onclick = async (e) => {\n  const value = e.target.closest('button')?.dataset.value;\n  if (!value) return;\n  await StreamBIM.API.colorCodeObjects(Object.fromEntries(groups[value].map((g) => [g, PALETTE[value]])));\n  await StreamBIM.API.zoomToSearchResult();\n};\n\nreturn Object.fromEntries(Object.entries(groups).map(([value, guids]) => [value, { color: PALETTE[value], count: guids.length, first: guids[0] }]));` },
          { title: 'Isolate one value (what a legend click does)', code: `const projectId = await StreamBIM.API.getProjectId();\nconst v2 = '/project-' + projectId + '/api/v1/v2/';\nconst checklist = JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + 'checklists' })).data.filter((c) => c.attributes.name === '${DEMO_CHECKLIST}').sort((a, b) => b.id - a.id)[0];\nconst deviationId = JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + 'checklist-options' })).data.find((o) => o.attributes.name === 'Deviation').id;\nconst query = { key: 'object', page: { skip: 0, limit: 10000 }, sort: { field: 'title', descending: false }, filter: { checklist: checklist.id }, format: 'json', filename: '' };\nconst rows = JSON.parse(await StreamBIM.API.makeApiRequest({ url: '/project-' + projectId + '/api/v1/checklists/export/json/?query=' + encodeURIComponent(btoa(JSON.stringify(query))), accept: 'application/json' })).data;\nconst deviations = rows.filter((r) => r.items['1. Status'] === deviationId).map((r) => r.object);\n\nawait StreamBIM.API.goHome();\nawait StreamBIM.API.colorCodeObjects(Object.fromEntries(deviations.map((g) => [g, '#e5484d'])));\nawait StreamBIM.API.setSearchVisualizationMode('FADED');\nawait StreamBIM.API.zoomToSearchResult();\nawait new Promise((r) => setTimeout(r, 2500));\nconst shot = await StreamBIM.API.takeScreenshot();\nawait StreamBIM.API.colorCodeObjects({});\nreturn shot;` },
        ],
      },
      {
        heading: 'Colour objects by checklist value (taskctrl flavour)',
        text: `In the \`taskctrl\` flavour, \`colorCodeObjectsWithLegends\` colours **objects** with your own colours, and StreamBIM draws the legend at the bottom of the viewer. Open the project as:

\`https://app.streambim.com/webapp/taskctrl/#/viewer/objectinfo/widget/<widget>?buildingId=…&projectId=…&forceFlavor=true\`

\`forceFlavor=true\` goes inside the hash. Placed before the \`#\` it redirected to the default flavour. Why it works there and not in default: taskctrl's scene filter passes the legends table (\`colorCodeByGuid.colorCoding\`) to the 3D search. That satisfies the \`COLOR_CODED\` check, and the material manager paints each object from the GUID map.

This example only runs in the taskctrl flavour. In default it rejects with "Method \`colorCodeObjectsWithLegends\` is not found".`,
        examples: [{ title: 'Doors coloured by their "Status" answer', code: `const projectId = await StreamBIM.API.getProjectId();\nconst v2 = '/project-' + projectId + '/api/v1/v2/';\nconst get = async (path) => JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + path })).data;\n\nconst checklist = (await get('checklists')).filter((c) => c.attributes.name === '${DEMO_CHECKLIST}').sort((a, b) => b.id - a.id)[0];\nconst item = (await get('checklist-items?filter[checklist]=' + checklist.id)).find((i) => i.attributes.title === 'Status');\nconst optionName = Object.fromEntries((await get('checklist-options')).map((o) => [o.id, o.attributes.name]));\nconst instances = await get('checklist-item-instances?page[limit]=1000&filter[checklist]=' + checklist.id);\n\n// Group object GUIDs by answer.\nconst groups = {};\nfor (const inst of instances) {\n  if (inst.relationships['checklist-item'].data.id !== item.id) continue;\n  const value = optionName[inst.attributes.options] || 'No answer';\n  (groups[value] = groups[value] || []).push(inst.relationships.object.data.id);\n}\n\n// GUID -> colour, plus label -> colour for StreamBIM's legend.\nconst PALETTE = { OK: '30a46c', Deviation: 'e5484d', 'Not inspected': 'f5d90a', 'No answer': '8b8d98' };\nconst data = {};\nfor (const [value, guids] of Object.entries(groups)) for (const g of guids) data[g] = PALETTE[value];\nconst legends = Object.fromEntries(Object.keys(groups).map((v) => [v, PALETTE[v]]));\n\nawait StreamBIM.API.resetObjectSearch();\nawait StreamBIM.API.goHome();\nawait StreamBIM.API.colorCodeObjectsWithLegends({ data, legends });\nawait StreamBIM.API.zoomToSearchResult();\nawait new Promise((r) => setTimeout(r, 3000));\nreturn await StreamBIM.API.takeScreenshot();` }],
      },
      {
        heading: 'What the viewer does natively (status only)',
        text: 'For comparison, this is the data behind StreamBIM\'s own "colour by checklist": `GET /octtree/colorcode` with `propKey=status` and `checklistId` or `checklistItemId`. It only ever returns status buckets.',
        examples: [{ title: 'Native status colour buckets', code: `const projectId = await StreamBIM.API.getProjectId();\nconst buildingId = await StreamBIM.API.getBuildingId();\nconst v2 = '/project-' + projectId + '/api/v1/v2/';\nconst checklist = JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + 'checklists' })).data.filter((c) => c.attributes.name === '${DEMO_CHECKLIST}').sort((a, b) => b.id - a.id)[0];\nreturn JSON.parse(await StreamBIM.API.makeApiRequest({\n  url: '/project-' + projectId + '/api/v1/octtree/colorcode?buildingId=' + buildingId + '&propKey=status&checklistId=' + checklist.id,\n  accept: 'application/json',\n}));` }],
      },
      {
        heading: 'Observed limitations (2026-11-01)',
        text: `- PATCHing an instance's \`status\` relationship to \`done\` (3000) was accepted, but the status stayed \`open\` and the export still says "not started". Answers (\`options\`) are saved. How the UI marks an instance done (signing) is not documented yet.
- Partial PATCHes (only the changed attributes) were not applied. Send the full record.
- The UI's "Assign checklist" re-saves the checklist from its own cache, which blanked the name set by the API. Set the name after assigning, or assign over the API.
- \`POST /v2/checklist-item-instances\` answers 500. Instances only come from the \`ifc-query\`.
- Publishing: \`is-draft: false\` stuck on the demo checklist, but on a checklist created and assigned in the same script it still read \`true\` afterwards. Instances were generated either way. \`instances-total\` on the checklist lags; count \`/v2/checklist-item-instances?filter[checklist]=…\` instead.
- \`/v2/workflows\` lists only topic workflows. Checklist workflows aren't listed, but are created automatically.
- After navigating the StreamBIM tab around (checklist pages, search) the viewer once ended up with a NaN camera: \`getCameraState()\` returned \`null\`s, screenshots were empty (\`"data:,"\`), and \`setCameraState\` didn't recover it. Reloading the page did.`,
      },
    ],
  },
  {
    slug: 'rest-api-from-widgets',
    title: 'Calling the StreamBIM REST API from a widget',
    intro: `A widget has no StreamBIM token of its own, but \`StreamBIM.API.makeApiRequest\` sends any request through the StreamBIM page, signed in as the current user. Every endpoint in the [REST docs](../../api/) that the user is allowed to call is reachable this way, without CORS setup or token handling.

What the host does: \`storeservice.makeRawRequest(url, body, { method, absoluteUrl: true, accept, contentType })\`, with \`accept\` and \`contentType\` defaulting to \`application/vnd.api+json\`. The response body comes back as a **string**.`,
    sections: [
      {
        heading: 'URL prefixes',
        text: `Paths are relative to the StreamBIM origin (\`https://app.streambim.com\` here). Which prefix to use:

| Prefix | What | Accept header |
|--------|------|---------------|
| \`/mgw/api/v3/…\` | Account-level JSON:API: projects, users, organisations, project links | default (\`application/vnd.api+json\`) |
| \`/project-{projectId}/api/v1/v2/…\` | Project JSON:API: topics, documents, checklists, ifc-objects, members, workflows, trains… | default |
| \`/project-{projectId}/api/v1/…\` | Project non-JSON:API: \`ifc-searches\`, \`*/export/json/\`, \`microtoken\`, \`sync\` | either |
| \`/bcf/2.1/…\` | BCF 2.1 | \`application/json\` (default fails) |

The \`/pgw/project-{id}/…\` form used in older notes did **not** work from the widget on app.streambim.com. The full per-endpoint result is in the compatibility table at the end.`,
      },
      {
        heading: 'GET and parse a JSON:API document',
        examples: [{ title: 'Read the project', code: `const projectId = await StreamBIM.API.getProjectId();\nconst text = await StreamBIM.API.makeApiRequest({ url: '/mgw/api/v3/projects/' + projectId });\nconst { data } = JSON.parse(text);\nreturn { id: data.id, type: data.type, attributes: Object.keys(data.attributes) };` }],
      },
      {
        heading: 'A reusable request helper',
        text: 'Wrap `makeApiRequest` once: parse JSON, and replace the `DataCloneError` that every HTTP error turns into.',
        examples: [{ title: 'Helper + topic statuses', code: `${REST_HELPER}\n\nconst projectId = await StreamBIM.API.getProjectId();\nconst statuses = await sbRequest('/project-' + projectId + '/api/v1/v2/topic-statuses');\nreturn statuses.data.map((s) => ({ id: s.id, ...s.attributes }));` }],
      },
      {
        heading: 'List topics with relationships',
        text: 'Project JSON:API lists return `{ data: [...], included?, meta? }`. Related records are ids in `relationships`.',
        examples: [{ title: 'First two topics', code: `${REST_HELPER}\n\nconst projectId = await StreamBIM.API.getProjectId();\nconst res = await sbRequest('/project-' + projectId + '/api/v1/v2/topics?page[limit]=2&page[skip]=0');\nreturn res.data.map((t) => ({\n  id: t.id,\n  title: t.attributes.title,\n  status: t.relationships && t.relationships.status && t.relationships.status.data,\n  relationships: Object.keys(t.relationships || {}),\n}));` }],
      },
      {
        heading: 'POST JSON (IFC search) and export the matches',
        text: 'Non-JSON:API endpoints need `contentType: "application/json"`. This is the same pair of calls `getObjectInfoForSearch` makes, with your own column list.',
        examples: [{ title: 'Search windows, export three rows', code: `${REST_HELPER}\n\nconst projectId = await StreamBIM.API.getProjectId();\nconst buildingId = await StreamBIM.API.getBuildingId();\nconst { searchId } = await sbRequest('/project-' + projectId + '/api/v1/ifc-searches', {\n  method: 'POST',\n  contentType: 'application/json',\n  body: { rules: [[{ buildingId, propKey: '@kind', propValue: 'Window' }]] },\n});\nconst fieldNames = btoa('GUID|Name|Long Name');\nconst rows = await sbRequest('/project-' + projectId + '/api/v1/ifc-searches/export/json?searchId=' + searchId + '&fieldUnion=true&fieldNames=' + fieldNames + '&page[limit]=3&page[skip]=0');\nreturn { searchId, rows: rows.data };` }],
      },
      {
        heading: 'Export endpoints with a base64 query',
        text: '`topics`, `documents` and `checklists` `/export/json/` need a `query` parameter: base64 of a JSON query object. Without it they fail.',
        examples: [{ title: 'Topics export (PowerBI format)', code: `${REST_HELPER}\n\nconst projectId = await StreamBIM.API.getProjectId();\nconst query = btoa(JSON.stringify({ skip: 0, limit: 2, selectors: {} }));\nconst res = await sbRequest('/project-' + projectId + '/api/v1/topics/export/json/?query=' + encodeURIComponent(query), { accept: 'application/json' });\nreturn Array.isArray(res) ? { rows: res.length, columns: Object.keys(res[0] || {}) } : { keys: Object.keys(res) };` }],
      },
      {
        heading: 'BCF needs application/json',
        examples: [
          { title: 'BCF projects', code: `const text = await StreamBIM.API.makeApiRequest({ url: '/bcf/2.1/projects', accept: 'application/json' });\nconst projects = JSON.parse(text);\nreturn { count: projects.length, first: projects[0] };` },
          { title: 'Same call with the default Accept', code: `try {\n  await StreamBIM.API.makeApiRequest({ url: '/bcf/2.1/projects' });\n  return 'ok';\n} catch (err) {\n  return err.message;\n}` },
        ],
      },
      {
        heading: 'Microtokens for links and downloads',
        text: 'A microtoken lets a plain URL (an `<img src>`, a download link, a new tab) authenticate without headers. `getAnnotatedFloorplan` returns URLs signed this way.',
        examples: [{ title: 'Get a microtoken', code: `const projectId = await StreamBIM.API.getProjectId();\nconst text = await StreamBIM.API.makeApiRequest({ url: '/project-' + projectId + '/api/v1/microtoken', accept: 'application/json' });\nconst body = JSON.parse(text);\nreturn Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 4) + '…' : v]));` }],
      },
      {
        heading: 'Errors',
        text: `When the backend answers with an HTTP error, the host rejects with the \`XMLHttpRequest\` object. postMessage cannot clone that, so the widget gets \`DataCloneError: Failed to execute 'postMessage' on 'MessagePort': XMLHttpRequest object could not be cloned.\` The status code and body are lost. To tell 404 from 403, check the path against the REST docs, or call it once from the StreamBIM tab's devtools.`,
        examples: [{ title: 'What a failed request looks like', code: `try {\n  await StreamBIM.API.makeApiRequest({ url: '/project-' + (await StreamBIM.API.getProjectId()) + '/api/v1/v2/no-such-thing' });\n} catch (err) {\n  return { name: err.name, message: err.message };\n}` }],
      },
    ],
    restSweep: true, // append the compatibility table from verification/rest-sweep-*.json
  },

  {
    slug: 'annotations-custom-objects',
    title: 'Custom objects: annotations, zones and property sets',
    intro: `StreamBIM lets users and widgets add their own objects to a building. They are stored as IFC objects (\`/v2/ifc-objects\`) with an empty \`layer\` and no source \`document\`, so the UI calls them *user created*. There are two kinds:

- **Annotations** (\`@kind: "Annotation"\`): a named point. The widget API creates them with \`createObject\`.
- **Zones** (\`@kind: "Space"\`): a floor outline with a height, a name, a description and property sets. The UI creates them with **Object information → ⋯ → Add zone**. A widget creates them over REST.

Both kinds can carry **property sets** (groups) with typed values, and **attachments**. A widget can do everything the UI does through \`makeApiRequest\`: create, edit property sets and values, move, attach files and delete.

> These examples write to the project. They were run on the demo project used for verification (\`npm run verify -- --include-writes\` in \`harness/\`). The zone examples delete what they create. Annotations can't be deleted, see [Delete](#delete).`,
    sections: [
      {
        heading: 'What a widget can do',
        text: `Verified on app.streambim.com, 2026-11-01:

| Task | How | Result |
|------|-----|--------|
| Create an annotation | \`StreamBIM.API.createObject({ center, name })\` | Resolves with the new GUID |
| Create a zone | \`POST /v2/ifc-objects\` (the same request the **Add zone** editor sends) | **200** with the full record |
| Read | \`GET /v2/ifc-objects/{id}?building={buildingId}\` | Full record with server-made groups |
| Edit name, property sets, values, outline | Full-record \`PATCH /v2/ifc-objects/{id}?building={buildingId}\` | **200** with the updated record |
| Attach a link or a file | \`POST /v2/attachments\` with \`parent-ifc-object\` (files: upload ticket → S3 \`PUT\` → attachment) | **200**; the S3 PUT works from the widget with \`fetch\` |
| Delete a zone | \`DELETE /v2/ifc-objects/{id}?building={buildingId}\` | **200** \`{"data":null}\`, then GET answers **404** |
| Delete an annotation | Same request | **200**, but the object stays (only its \`Custom\` group goes) |
| Find with search | \`findObjects\` | Found by \`@kind\` at once. Not found by other properties (e.g. \`Name\`) until the building is **reprocessed** |
| Show in 3D | n/a | A new zone was not drawn in 3D before reprocessing |

POST and PATCH answer with the record **as you sent it**. Read it back with GET to see what was stored (see [value types](#property-sets-and-value-types)).

**The UI tools and their requests.** In **Object information**, the panel's ⋯ menu has **Add zone**: draw the outline on the floor plan, pick a storey, height and offset from the floor, fill in Name, Long Name and Description, and add property sets and properties (+ New property set, + Add property). **Save** sends one \`POST /v2/ifc-objects\`. For a user-created object, the ⋯ menu also has **Edit** (the same editor, saved with a full-record \`PATCH\`), **Duplicate** (a \`POST\` of a copy named "<Name> Copy") and **Delete** (\`DELETE\`). A widget can make every one of these requests.

After **Add zone** the UI itself says: *"Zone created. You need to reprocess the model before you can search for objects within the new zone."* \`getObjectInfo(id)\` works at once, but it returns the viewer's cached copy. After a PATCH or DELETE it keeps showing the old record until the page reloads, so read over REST to see the current state.`,
      },
      {
        heading: 'Data model',
        text: `Ember model \`ifc-object\` (JSON:API type \`ifc-objects\`). Stored coordinates are metres in the building's coordinate system, z up: the same frame as every object's \`bbox\` and \`center\`. Points that the widget API hands out (\`pickedObject.point\`, \`getCameraState().position\`) use the viewer's axes instead: building \`[x, y, z]\` arrives as \`[x, -z, y]\`. A door at building \`[-9.96, 7.92, 3.15]\` was picked as \`[-9.96, -3.15, 7.92]\`.

| Field | Annotation | Zone |
|-------|------------|------|
| \`id\` | New 22-char IFC GUID from the backend | Same |
| \`properties\` | \`{ "@kind": "Annotation", "Name" }\` | \`{ "Name", "Long Name", "@kind": "Space", "Description" }\` |
| server-added properties | \`Global Id\`, \`@Building Storey\` (floor by position), \`BaseType: "ifcelement"\`, \`uri\`, \`Timestamp\`, … | Same, with \`BaseType: "ifcspatialstructureelement"\` |
| \`center\` | Point. \`createObject\` converts the widget point \`[a, b, c]\` to \`[a, c, -b]\` | \`[cx, cy, (bottom + top) / 2]\` |
| \`boundary\` | \`[x, y]\` | Flat outline \`[x1, y1, x2, y2, …]\` in plan |
| \`bbox\` | Degenerate box at the centre | \`[minX, minY, bottom, maxX, maxY, top]\` |
| \`layer\` | \`""\` (\`null\` on write) | Same |
| \`relationships.floors\` | Set by the server from the height | Set by the client. The editor uses the chosen storey |
| \`groups\` (property sets) | Your groups, plus server groups \`Location\`, \`Geometry\`, \`Custom\` | Your groups (the editor starts with \`BaseQuantities:\`), plus \`Location\` and \`Custom\` |

\`Custom\` holds Created/Updated At/By (with the user's email). \`Location\` holds *Floor by position*. The server recomputes both: send only your own groups when you write.

The **Add zone** editor fills \`BaseQuantities:\` from the outline: \`GrossFloorArea\` and \`GrossCeilingArea\` (\`square_metre\`) and \`GrossPerimeter\` (\`millimetre\`). The server doesn't compute them, so a widget that changes the outline should update them too.`,
      },
      {
        heading: 'Helpers used below',
        text: `The examples share these helpers. \`save()\` does what the StreamBIM UI does: it sends the whole user-editable part of the record. A partial PATCH isn't applied (the same as other \`/v2\` records). It also drops the server-made properties and groups, and re-types values, because GET returns every value as a string.

\`\`\`js
${OBJ}
\`\`\``,
      },
      {
        heading: 'Create a zone',
        text: `A zone needs a floor and a height range. This example borrows both from an existing room. It then draws a 2 × 2 m square around the room's centre, reads the zone back, and deletes it again.`,
        examples: [{ title: 'Create, read and delete a zone', writes: true, prelude: OBJ, code: `const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const [, , bottom, , , top] = room.attributes.bbox;
const zone = await createZone({
  name: 'Docs example zone',
  floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1],
  bottom, top,
  groups: [{ label: 'BaseQuantities:', content: { properties: [prop('GrossFloorArea', 4, 'area', 'square_metre'), prop('GrossPerimeter', 8000, 'length', 'millimetre')] } }],
});
const cached = await StreamBIM.API.getObjectInfo(zone.id);
const foundBySearch = {
  byName: (await StreamBIM.API.findObjects({ key: 'Name', value: 'Docs example zone', limit: 5 })).includes(zone.id),
  byKind: (await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 5000 })).includes(zone.id),
};
const deleteResponse = await remove(zone.id);
return {
  id: zone.id,
  properties: zone.attributes.properties,
  bbox: zone.attributes.bbox,
  floors: zone.relationships.floors.data.map((f) => f.id),
  groups: groupsOf(zone),
  getObjectInfoKind: cached.properties['@kind'],
  foundBySearch,
  deleteResponse,
  existsAfterDelete: await exists(zone.id),
};` }],
      },
      {
        heading: 'Property sets and value types',
        text: `A property set is a group: \`{ label, content: { properties: [{ key, value, valueType, measure, unit, valueItem }] } }\`. The UI's property editor offers **Decimal**, **Text**, **Integer** and **True/false** (\`float8\`, \`str\`, \`int64\`, \`bool\`), and lets you add, rename and delete properties and groups. All of it is saved with the same full-record PATCH.

**The server stores the JSON type of \`value\`, not \`valueType\`:** a number becomes \`float8\` (also when you ask for \`int64\`), a boolean becomes \`bool\`, and a string becomes \`str\`. The UI's own editor sends Decimal values as strings, so a Decimal typed in the UI is saved as \`str\`. Send real numbers and booleans. There is no way to store \`int64\`. GET returns every value as a string together with its stored \`valueType\`. The POST and PATCH responses echo your request, so only GET shows the stored types (compare \`response\` and \`stored\` below).`,
        examples: [{ title: 'Add a property set, edit values, see the stored types', writes: true, prelude: OBJ, code: `const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const zone = await createZone({
  name: 'Docs example zone (psets)', floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1], bottom: room.attributes.bbox[2], top: room.attributes.bbox[5],
  // What the UI editor sends for Decimal 4.5: a string with valueType float8.
  groups: [{ label: 'Widget_Pset', content: { properties: [{ key: 'Score', value: '4.5', valueType: 'float8', measure: '', unit: '', valueItem: '' }] } }],
});
// POST and PATCH responses echo the request: read back with GET to see what was stored.
const created = { response: groupsOf(zone), stored: groupsOf(await get(zone.id)) };
const response = await save(zone.id, (a) => {
  a.properties['Long Name'] = 'Edited by a widget';
  a.properties.Description = 'Status set from a widget';
  a.groups = [{ label: 'Widget_Pset', content: { properties: [
    prop('Status', 'Inspected'),
    prop('Score', 4.5),
    { key: 'Count', value: 7, valueType: 'int64', measure: '', unit: '', valueItem: '' },
    prop('Approved', true),
  ] } }];
});
const stored = await get(zone.id);
await remove(zone.id);
return {
  created,
  patched: { response: groupsOf(response), stored: groupsOf(stored) },
  names: [stored.attributes.properties.Name, stored.attributes.properties['Long Name']],
  existsAfterDelete: await exists(zone.id),
};` }],
      },
      {
        heading: 'Move or reshape a zone',
        text: `Change \`boundary\`, \`bbox\` and \`center\` together in one PATCH, and update \`BaseQuantities:\` if you keep them. To move a zone to another storey, change \`relationships.floors\` as well. The \`save()\` helper keeps the current floor.`,
        examples: [{ title: 'Grow a zone from 2 × 2 m to 4 × 3 m', writes: true, prelude: OBJ, code: `const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const [, , bottom, , , top] = room.attributes.bbox;
const zone = await createZone({ name: 'Docs example zone (move)', floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1], bottom, top });
const [x0, y0, x1, y1] = [cx - 2, cy - 1.5, cx + 2, cy + 1.5];
const moved = await save(zone.id, (a) => {
  a.boundary = [x0, y1, x0, y0, x1, y0, x1, y1];
  a.bbox = [x0, y0, bottom, x1, y1, top];
  a.center = [cx, cy, (bottom + top) / 2];
  a.groups = [{ label: 'BaseQuantities:', content: { properties: [prop('GrossFloorArea', (x1 - x0) * (y1 - y0), 'area', 'square_metre'), prop('GrossPerimeter', 2000 * ((x1 - x0) + (y1 - y0)), 'length', 'millimetre')] } }];
});
await remove(zone.id);
return { before: zone.attributes.bbox, after: moved.attributes.bbox, quantities: groupsOf(moved).find((g) => g.label === 'BaseQuantities:').values };` }],
      },
      {
        heading: 'Attachments',
        text: `Custom objects can carry attachments, the same records topics use, with \`parent-ifc-object\`. See [attachments.md](../../api/attachments.md) for every field. From a widget:

- **Link:** \`POST /v2/attachments\` with \`category: "url"\` and a \`url\`.
- **File:** \`POST /v2/upload-tickets\` with \`filename\` and \`file-size\` → \`PUT\` the bytes to \`s3presignedurl\` with the widget's own \`fetch\` (S3 allows it) → \`POST /v2/attachments\` with the \`upload-ticket\`. A file sent with \`category: "file"\` was stored as \`topic-image\`.
- **Project document:** the UI's *add documents to object* sends \`category: "document"\` with a \`linked-document\` relationship.

All of these POSTs answered 200 with the record. \`DELETE /v2/attachments/{id}\` removes an attachment.`,
        examples: [{ title: 'Attach a link and a file to a zone, list, clean up', writes: true, prelude: OBJ, code: `const v2 = '/project-' + projectId + '/api/v1/v2/';
const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const zone = await createZone({ name: 'Docs example zone (attachments)', floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1], bottom: room.attributes.bbox[2], top: room.attributes.bbox[5] });
const parent = { 'parent-ifc-object': { data: { type: 'ifc-object', id: zone.id } } };
const post = async (path, data) => JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + path, method: 'POST', body: { data } })).data;

const link = await post('attachments', { type: 'attachments', attributes: { category: 'url', url: 'https://github.com/jonatanjacobsson/streambim-api-docs' }, relationships: parent });

const file = new Blob(['Written by a StreamBIM widget'], { type: 'text/plain' });
const ticket = await post('upload-tickets', { type: 'attachments', attributes: { filename: 'widget-note.txt', 'file-size': file.size } });
const s3 = await fetch(ticket.attributes.s3presignedurl, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: file });
const uploaded = await post('attachments', { type: 'attachments', attributes: { category: 'file' },
  relationships: { ...parent, 'upload-ticket': { data: { type: 'upload-tickets', id: ticket.id } } } });

const list = JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + 'attachments?filter[object]=' + zone.id + '&filter[building]=' + buildingId })).data;
for (const a of list) await StreamBIM.API.makeApiRequest({ url: v2 + 'attachments/' + a.id, method: 'DELETE' });
await remove(zone.id);
return {
  s3Status: s3.status,
  attached: list.map((a) => ({ category: a.attributes.category, filename: a.attributes.filename, filesize: a.attributes.filesize, url: a.attributes.url })),
  linkId: link.id, fileId: uploaded.id,
};` }],
      },
      {
        heading: 'Create an annotation',
        text: `\`createObject({ center, name })\` builds the record in the StreamBIM page and saves it with the same \`POST /v2/ifc-objects\` (\`properties: { Name, "@kind": "Annotation" }\`, \`groups: []\`, no floor). It resolves with the new id. The centre is converted from \`[a, b, c]\` to \`[a, c, -b]\`, which turns a viewer point into building coordinates. So pass a \`pickedObject.point\` or the camera position as is. To place an annotation at building coordinates \`[x, y, z]\` (e.g. a zone's centre), pass \`[x, -z, y]\`. The server picks the floor from the resulting height, and a point below every floor makes later writes fail with *"floors get at height: no rows in result set"*.

You can then edit an annotation like a zone: rename it, give it property sets, attach files. This example leaves its annotation in the project, because annotations can't be deleted.`,
        examples: [{ title: 'Create an annotation at the camera, then add a property set', writes: true, prelude: OBJ, code: `const { position } = await StreamBIM.API.getCameraState();
const id = await StreamBIM.API.createObject({ center: position, name: 'Docs example annotation' });
const created = await get(id);
const edited = await save(id, (a) => {
  a.properties.Description = 'Placed by a widget';
  a.groups = [{ label: 'Widget_Pset', content: { properties: [prop('Status', 'Open'), prop('Priority', 2)] } }];
});
return {
  id,
  widgetPosition: position,
  storedCenter: created.attributes.center,
  properties: { Name: edited.attributes.properties.Name, Description: edited.attributes.properties.Description, kind: edited.attributes.properties['@kind'] },
  floors: edited.relationships.floors.data.map((f) => f.id),
  groups: groupsOf(edited),
};` }],
      },
      {
        heading: 'Read the full record over REST',
        text: '`getObjectInfo` returns the viewer\'s cached copy. The REST record has the current server-side groups and the attachments relationship.',
        examples: [{ title: 'GET /v2/ifc-objects/{id}', code: `const projectId = await StreamBIM.API.getProjectId();\nconst buildingId = await StreamBIM.API.getBuildingId();\nconst [id] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Annotation', limit: 1 });\nconst { data } = JSON.parse(await StreamBIM.API.makeApiRequest({ url: '/project-' + projectId + '/api/v1/v2/ifc-objects/' + id + '?building=' + buildingId }));\nreturn {\n  id: data.id,\n  properties: data.attributes.properties,\n  groups: data.attributes.groups.map((g) => ({ label: g.label, keys: g.content.properties.map((p) => p.key) })),\n  relationships: Object.fromEntries(Object.entries(data.relationships).map(([k, v]) => [k, v.data])),\n};` }],
      },
      {
        heading: 'List annotations',
        text: 'Indexed annotations are searchable by `@kind`. Model files can also contain IFC annotations (e.g. Revit model lines exported as `IfcAnnotation`); tell them apart by `layer` (non-empty for model objects).',
        examples: [{ title: 'User-made vs model annotations', code: `const ids = await StreamBIM.API.findObjects({ key: '@kind', value: 'Annotation', limit: 100 });\nconst rows = [];\nfor (const id of ids) {\n  const info = await StreamBIM.API.getObjectInfo(id);\n  rows.push({ id, name: info.properties.Name, userCreated: !info.layer });\n}\nreturn rows;` }],
      },
      {
        heading: 'Delete',
        text: `There is no widget method. The StreamBIM UI (**Object information → ⋯ → Delete**) calls Ember Data \`destroyRecord()\`, which sends \`DELETE /project-{id}/api/v1/v2/ifc-objects/{id}?building={buildingId}\`, and then reloads the floors' zone outlines. A widget can send the same request.

**Observed (2026-11-01):**

- **Zones** are deleted. The DELETE answers \`{"data":null}\`, and the next GET answers 404 *"no such object exists"*.
- **Annotations are not.** The DELETE answers \`{"data":null}\` as well, but only the \`Custom\` group (Created/Updated At/By) is removed. The object is still served by GET and found by search, with \`jobdeleted: 0\`, also after a second DELETE and hours later. To retire an annotation, rename it or mark it with a property instead, and filter those out in your widget.
- If the object's height is below every floor, the DELETE fails with 500 *"delete space geojson cache … floors get at height: sql: no rows in result set"*.
- \`getObjectInfo\` keeps returning the deleted object until the page reloads.`,
        examples: [{ title: 'Delete an annotation, then check that it is still there', writes: true, prelude: OBJ, code: `const { position } = await StreamBIM.API.getCameraState();
const id = await StreamBIM.API.createObject({ center: position, name: 'Docs example (deleted)' });
const groupsBefore = (await get(id)).attributes.groups.map((g) => g.label);
const deleteResponse = await remove(id);
let groupsAfter;
try { groupsAfter = (await get(id)).attributes.groups.map((g) => g.label); } catch (err) { groupsAfter = 'not found'; }
return { id, groupsBefore, deleteResponse, groupsAfterDelete: groupsAfter };` }],
      },
      {
        heading: 'Project property catalogue (read only)',
        text: `\`GET /v2/ifc-properties?buildingId={buildingId}\` lists every property set and property in the building: \`pset\`, \`name\`, \`datatype\`, \`basetype\`, how many objects use it, and admin flags (\`promote\`, \`hide\`, \`optimizeForSearch\`, \`ignoreForHistory\`). A widget can use it to offer existing pset and property names. The UI changes the flags with \`POST /ifc-properties?buildingId=\` in project admin. That's project configuration, so this guide doesn't write to it.`,
        examples: [{ title: 'Property sets in this building', code: `const projectId = await StreamBIM.API.getProjectId();\nconst buildingId = await StreamBIM.API.getBuildingId();\nconst { data } = JSON.parse(await StreamBIM.API.makeApiRequest({ url: '/project-' + projectId + '/api/v1/v2/ifc-properties?buildingId=' + buildingId }));\nconst psets = {};\nfor (const p of data) psets[p.attributes.pset] = (psets[p.attributes.pset] || 0) + 1;\nconst [first] = data;\nreturn { properties: data.length, psets: Object.keys(psets).length, largest: Object.entries(psets).sort((a, b) => b[1] - a[1]).slice(0, 5), sample: { pset: first.attributes.pset, name: first.attributes.name, datatype: first.attributes.datatype, basetype: first.attributes.basetype, objectsWithProperty: first.attributes.objectsWithProperty } };` }],
      },
      {
        heading: 'Ideas for widgets',
        text: `- **Work zones:** draw temporary areas (safety zones, deliveries, takt areas) from a widget form, with dates and a responsible person in a property set, and delete them when the work is done.
- **Status per room:** keep inspection or cleaning status in a zone's property set and colour the zones with \`colorCodeSpaces\` once they are indexed.
- **Point notes:** drop an annotation at the clicked point (\`pickedObject\` → \`createObject\`), then attach a photo or a link to a document.
- **Import:** create zones from a CSV or GIS outline, with \`BaseQuantities:\` computed in the widget.
- **Data entry:** use a zone's property sets as a small form backed by StreamBIM, with no extra server.

Plan for the limits above: new objects are found by \`@kind\` but not by their properties, and aren't drawn in 3D, until the building is reprocessed. Annotations can't be removed. Keep your own list of the GUIDs you create (e.g. in a property such as \`Source: my-widget\`, or in your widget's storage).`,
      },
    ],
  },
];
