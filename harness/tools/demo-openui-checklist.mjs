// Demo: what an agent does with streambim_render_openui. Reads a checklist from the live
// project, writes an OpenUI Lang dashboard for it and renders it (streaming) in the widget.
// Buttons in the dashboard colour/isolate rooms in the viewer and talk back to the agent.
//
// Usage: node tools/demo-openui-checklist.mjs ["Checklist name"] [clientId]
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [checklistName = 'Widget demo: room inspection', clientId] = process.argv.slice(2);
const client = new Client({ name: 'openui-demo', version: '0.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL || 'http://localhost:3000/mcp')));
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: { ...args, ...(clientId ? { clientId } : {}) } }, undefined, { timeout: 120000 });
  const body = JSON.parse(res.content[0].text);
  if (res.isError) throw new Error(JSON.stringify(body));
  return body.result;
};

// 1. Data: checklist answers per object (same REST calls as the checklist guide).
const data = await call('streambim_execute_js', { code: `
const projectId = await api.getProjectId();
const v2 = '/project-' + projectId + '/api/v1/v2/';
const get = async (p) => JSON.parse(await api.makeApiRequest({ url: v2 + p })).data;
const checklist = (await get('checklists')).filter((c) => c.attributes.name === ${JSON.stringify(checklistName)}).sort((a, b) => b.id - a.id)[0];
const item = (await get('checklist-items?filter[checklist]=' + checklist.id))[0];
const optionName = Object.fromEntries((await get('checklist-options')).map((o) => [o.id, o.attributes.name]));
const instances = await get('checklist-item-instances?page[limit]=1000&filter[checklist]=' + checklist.id);
return { checklistId: checklist.id, name: checklist.attributes.name, item: item.attributes.title,
  rows: instances.map((i) => ({ guid: i.relationships.object.data.id, title: i.attributes.title, value: optionName[i.attributes.options] || 'No answer' })) };` });

// 2. Agent-side: turn the data into OpenUI Lang.
const PALETTE = { OK: '#30a46c', Deviation: '#e5484d', 'Not inspected': '#f5d90a', 'No answer': '#8b8d98' };
const VARIANT = { OK: 'success', Deviation: 'danger', 'Not inspected': 'warning', 'No answer': 'neutral' };
const ICON = { OK: 'circle-check', Deviation: 'triangle-alert', 'Not inspected': 'circle-help', 'No answer': 'circle' };
const groups = {};
for (const r of data.rows) (groups[r.value] = groups[r.value] || []).push(r);
const values = Object.keys(groups);
const q = (s) => JSON.stringify(s);
const colourMap = (vals) => Object.fromEntries(vals.flatMap((v) => groups[v].map((r) => [r.guid, PALETTE[v]])));
// Viewer calls ride in @ToAssistant context: {streambim: {method, args}}.
const viewer = (label, method, args, variant = 'secondary') =>
  `Button(${q(label)}, @ToAssistant(${q(label)}, {streambim: {method: ${q(method)}, args: ${JSON.stringify(args).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:')}}}), ${q(variant)}, "normal", "small")`;

const lines = [
  'root = Card([header, overview, chart, actions, table, followups])',
  `header = CardHeader(${q(data.name)}, ${q(data.rows.length + ' rooms · item "' + data.item + '"')})`,
  `overview = OverviewCardBlock([${values.map((_, i) => 'ov' + i).join(', ')}], "grid")`,
  ...values.map((v, i) => `ov${i} = OverviewCardItem(${q(v)}, IconText(Icon(${q(ICON[v])}), ${q(VARIANT[v])}, "s", ${q(v)}), MetricIndicatorInline(${q(String(groups[v].length))}, ${q(Math.round((100 * groups[v].length) / data.rows.length) + '% of rooms')}))`),
  `chart = PieChart(${JSON.stringify(values)}, ${JSON.stringify(values.map((v) => groups[v].length))}, "donut")`,
  `actions = Buttons([showAll, ${values.map((_, i) => 'only' + i).join(', ')}, reset])`,
  `showAll = ${viewer('Colour all rooms', 'colorCodeSpaces', [colourMap(values)], 'primary')}`,
  ...values.map((v, i) => `only${i} = ${viewer('Only ' + v, 'colorCodeSpaces', [colourMap([v])])}`),
  `reset = ${viewer('Reset', 'colorCodeSpaces', [{}], 'tertiary')}`,
  `table = Table([colRoom, colStatus])`,
  `colRoom = Col("Room", ${JSON.stringify(data.rows.map((r) => r.title))})`,
  `colStatus = Col("Status", ${JSON.stringify(data.rows.map((r) => r.value))})`,
  'followups = FollowUpBlock([f1, f2])',
  'f1 = FollowUpItem("Create topics for the deviation rooms")',
  'f2 = FollowUpItem("Which rooms are not inspected yet?")',
];
const program = lines.join('\n');
console.log(program, '\n');

// 3. Render it, streaming line by line.
console.log(await call('streambim_render_openui', { openui: program, streamMs: 120 }));
// Start with the full colour coding applied.
await call('streambim_call', { method: 'colorCodeSpaces', args: [colourMap(values)] });
await client.close();
