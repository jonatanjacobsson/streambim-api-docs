// Door query -> OpenUI door report in the StreamBIM widget.
// Queries all doors with every property column (getObjectInfoForSearch, fieldUnion), then
// renders summary cards, a per-type chart, a clickable door list (fly to door), isolate buttons
// and a details table.
//
// Usage: node tools/openui-door-report.mjs [clientId]
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [clientId] = process.argv.slice(2);
const client = new Client({ name: 'openui-door-report', version: '0.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL || 'http://localhost:3000/mcp')));
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: { ...args, ...(clientId ? { clientId } : {}) } }, undefined, { timeout: 120000 });
  const body = JSON.parse(res.content[0].text);
  if (res.isError) throw new Error(JSON.stringify(body));
  return body.result;
};

// 1. Query.
const doors = await call('streambim_execute_js', { code: `
const res = await api.getObjectInfoForSearch({ filter: { key: '@kind', value: 'Door' }, page: { limit: 1000 }, sort: { field: 'Name', descending: false }, fieldUnion: true });
return res.data.map((d) => ({
  guid: d.GUID,
  name: d.Name,
  typeName: d['Type Name'],
  typeId: d['BIP~TypeID'] || d['Type~Tag'] || '',
  floor: d['Location~Floor by position'] || d['BIP~StoreyName'] || '',
  room: d['Space Global Id'] || '',
  width: Number(d['BIP~Width'] || d['BaseQuantities~Width']) || null,
  height: Number(d['BIP~Height'] || d['BaseQuantities~Height']) || null,
  area: d['BaseQuantities~Area'] ?? null,
  external: String(d['Pset_DoorCommon~IsExternal']).toLowerCase() === 'true',
  contract: d['BIP~ContractID'] || '',
  status: d['BIP~StatusConstruction'] || '',
}));` });

// 2. OpenUI Lang.
const q = (s) => JSON.stringify(s ?? '');
const n = doors.length;
const ext = doors.filter((d) => d.external);
const int = doors.filter((d) => !d.external);
const byType = {};
for (const d of doors) byType[d.typeId || d.typeName] = (byType[d.typeId || d.typeName] || 0) + 1;
const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);
const size = (d) => (d.width && d.height ? `${d.width} × ${d.height} mm` : '');
const viewer = (label, method, args, variant = 'secondary') =>
  `Button(${q(label)}, @ToAssistant(${q(label)}, {streambim: {method: ${q(method)}, args: ${JSON.stringify(args)}}}), ${q(variant)}, "normal", "small")`;
const isolate = (list) => Object.fromEntries(list.map((d) => [d.guid, '3e63dd']));

const lines = [
  'root = Card([header, overview, typeChart, actions, doorList, details])',
  `header = CardHeader("Doors", ${q(`${n} doors · ${types.length} types · ${[...new Set(doors.map((d) => d.floor))].length} floors`)})`,
  'overview = OverviewCardBlock([cTotal, cExt, cInt], "grid")',
  `cTotal = OverviewCardItem("total", IconText(Icon("door-open"), "info", "s", "Doors"), MetricIndicatorInline(${q(String(n))}))`,
  `cExt = OverviewCardItem("ext", IconText(Icon("sun"), "warning", "s", "External"), MetricIndicatorInline(${q(String(ext.length))}))`,
  `cInt = OverviewCardItem("int", IconText(Icon("home"), "success", "s", "Internal"), MetricIndicatorInline(${q(String(int.length))}))`,
  `typeChart = HorizontalBarChart(${JSON.stringify(types.map(([t]) => t))}, [Series("Doors", ${JSON.stringify(types.map(([, c]) => c))})])`,
  'actions = Buttons([bAll, bExt, bInt, bReset])',
  `bAll = ${viewer('Show all doors', 'applyObjectSearch', [{ key: '@kind', value: 'Door' }], 'primary')}`,
  `bExt = ${viewer('Only external', 'colorCodeObjects', [isolate(ext)])}`,
  `bInt = ${viewer('Only internal', 'colorCodeObjects', [isolate(int)])}`,
  `bReset = ${viewer('Reset', 'resetObjectSearch', [], 'tertiary')}`,
  `doorList = ListBlock([${doors.map((_, i) => 'd' + i).join(', ')}], "number", "small")`,
  ...doors.map((d, i) => `d${i} = ListItem(${q(`${d.typeId || d.typeName} · ${d.floor}`)}, ${q([size(d), d.external ? 'external' : 'internal', d.name].filter(Boolean).join(' · '))}, null, "Go to", @OpenUrl(${q('streambim://gotoObject/' + d.guid)}))`),
  'details = SectionBlock([sTable])',
  'sTable = SectionItem("details", "All door properties", [table])',
  'table = Table([cType, cFloor, cSize, cArea, cExtCol, cContract, cStatus, cName])',
  `cType = Col("Type", ${JSON.stringify(doors.map((d) => d.typeId || d.typeName))})`,
  `cFloor = Col("Floor", ${JSON.stringify(doors.map((d) => d.floor))})`,
  `cSize = Col("W × H (mm)", ${JSON.stringify(doors.map((d) => (d.width && d.height ? `${d.width} × ${d.height}` : '')))})`,
  `cArea = Col("Area (m²)", ${JSON.stringify(doors.map((d) => (d.area == null ? null : Math.round(d.area * 100) / 100)))}, "number")`,
  `cExtCol = Col("External", ${JSON.stringify(doors.map((d) => (d.external ? 'yes' : 'no')))})`,
  `cContract = Col("Contract", ${JSON.stringify(doors.map((d) => d.contract))})`,
  `cStatus = Col("Status", ${JSON.stringify(doors.map((d) => d.status))})`,
  `cName = Col("Name", ${JSON.stringify(doors.map((d) => d.name))})`,
];
const program = lines.join('\n');
console.log(program, '\n');

// 3. Render (streamed) and show all doors in the viewer.
console.log(await call('streambim_render_openui', { openui: program, streamMs: 40 }));
await call('streambim_call', { method: 'applyObjectSearch', args: [{ key: '@kind', value: 'Door' }] });
await call('streambim_call', { method: 'zoomToSearchResult', args: [] });
console.log({ doors: n, external: ext.length, internal: int.length, types: Object.fromEntries(types) });
await client.close();
