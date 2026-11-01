// MCP tool, resource and prompt definitions. One McpServer is created per MCP session;
// all sessions share the same Bridge (and therefore the same connected widgets).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchDocs } from './docs.mjs';

export const WIDGET_METHODS = [
  'setAuthToken', 'getProjectId', 'getUserEmail', 'getBuildingId',
  'getCameraState', 'setCameraState', 'setCameraPosition', 'getViewportState', 'setViewportState', 'applyViewpoint',
  'gotoObject', 'gotoSpace', 'gotoFloor', 'goHome',
  'highlightObject', 'deHighlightObject', 'deHighlightAllObjects', 'hideObject', 'showObject', 'showAllObjects', 'highlightSystem',
  'getObjectInfo', 'getFloors', 'getSpaces', 'valuesForObjectProperty',
  'findObjects', 'applyObjectSearch', 'getObjectInfoForSearch', 'resetObjectSearch', 'setSearchVisualizationMode', 'zoomToSearchResult', 'quickSearch',
  'colorCodeObjects', 'colorCodeObjectsWithLegends', 'colorCodeSpaces', 'colorCodeSpacesWithLegends', 'colorCodeByProperty',
  'getLayers', 'setLayers', 'showGrids', 'hideGrids',
  'takeScreenshot', 'getMapImage', 'getAnnotatedFloorplan', 'createObject',
  'setStyles', 'setSkyColor', 'setNavigationMode', 'setExpanded', 'setShowExpandButton', 'toggleShowAllFloors',
  'makeApiRequest', 'setViewLayout', 'clipToFloor',
];

const INSTRUCTIONS = `This server drives a live StreamBIM 3D viewer (BIM/IFC models) through a widget running inside the StreamBIM web app.

How it works: your code runs inside the widget's iframe in the user's browser. In that iframe, \`api\` is the connected StreamBIM widget API (StreamBIM.API, penpal proxy): every method returns a Promise. You also have normal browser APIs (fetch, DOM of the widget pane, canvas, etc.), but NOT the parent StreamBIM page DOM (cross-origin).

Start with streambim_status. Prefer streambim_call for single API calls and streambim_execute_js for multi-step logic (loops, searches, colour coding many objects). Use streambim_screenshot to see the result. Use streambim_get_events to read user clicks (pickedObject), camera, floor and space changes.

REST: \`api.makeApiRequest({url, method, body})\` (or helper \`rest(path, opts)\`) calls StreamBIM's backend with the user's session. Project-scoped paths are '/project-{projectId}/api/v1/...' (verified for ifc-searches; the '/pgw/project-...' variant in the docs returned errors on app.streambim.com). Failed requests only say "HTTP error": the widget API hides the status code. Look up endpoints with streambim_docs (search "ifc-searches", "topics", "documents" ...). The REST notes are unofficial/reverse-engineered; the widget API notes follow the official github.com/streambim/streambim-widget-api.

Before relying on a method, read its verified page: streambim_docs path "widget/methods/<name>.md" (index: "widget/README.md"). Known traps, verified on app.streambim.com:
- Not available: highlightSystem, toggleShowAllFloors, applyViewpoint, colorCode*WithLegends, setViewLayout, clipToFloor.
- Never resolve (don't await): setCameraPosition, deHighlightAllObjects, applyStyles; getMapImage did not settle in 3D layout.
- deHighlightObject always rejects; use setViewportState({ highlightedObjects }).
- Custom colours: colorCodeSpaces({ spaceGuid: "#rrggbb" }) renders them in every flavour. For objects, colorCodeObjects ignores the colours (search green) in the default flavour; in the taskctrl flavour (/webapp/taskctrl/#/...&forceFlavor=true) colorCodeObjectsWithLegends({ data: {guid: "rrggbb"}, legends: {label: "rrggbb"} }) colours objects. colorCodeByProperty uses the viewer palette.
- Rejections are { code, debug }.
- Custom objects (zones, annotations, property sets): POST/PATCH (full record)/DELETE /v2/ifc-objects?building=. Pset value types follow the JSON type (number→float8, bool→bool, string→str). Annotations can't be deleted. Guide: widget/guides/annotations-custom-objects.md.

Generative UI: streambim_render_openui renders OpenUI Lang (https://www.openui.com) in the widget pane. Call streambim_openui_spec first for the components and rules. Buttons drive the viewer with @ToAssistant("label", {streambim: {method: "colorCodeSpaces", args: [{...}]}}) or @OpenUrl("streambim://gotoObject/<guid>"); clicks come back as "openuiAction" events (streambim_get_events). Guide: streambim_docs path "openui/README.md".

Colours are hex strings. GUIDs are IFC GlobalIds. Search queries look like {key:'@kind', value:'Door', limit:100} or {filter:{rules:[[{buildingId, psetName, propKey, propValue, operator}]]}, page:{limit, skip}}.`;

const json = (v) => JSON.stringify(v, null, 2);

function toContent(res) {
  const content = [];
  const body = { result: res.value };
  if (res.logs?.length) body.logs = res.logs;
  if (res.truncated) body.truncated = true;
  if (res.durationMs != null) body.durationMs = res.durationMs;
  content.push({ type: 'text', text: json(body) });
  for (const img of res.images || []) {
    const m = /^data:(image\/[a-z+]+);base64,(.*)$/s.exec(img);
    if (m) content.push({ type: 'image', mimeType: m[1], data: m[2] });
  }
  return { content };
}

function toError(err) {
  const payload = { error: err.message };
  if (err.detail) payload.detail = err.detail;
  if (err.logs?.length) payload.logs = err.logs;
  return { isError: true, content: [{ type: 'text', text: json(payload) }] };
}

const clientIdArg = z.string().optional().describe('Target widget clientId (from streambim_status). Defaults to the most recently connected widget.');

export function createMcpServer({ bridge, docs, version }) {
  const server = new McpServer({ name: 'streambim-widget', version }, { instructions: INSTRUCTIONS });

  const run = async (fn) => { try { return await fn(); } catch (e) { return toError(e); } };

  server.registerTool('streambim_status', {
    title: 'StreamBIM connection status',
    description: 'List connected StreamBIM widgets with project id, building id, user and whether the viewer connection is live. Call this first.',
    inputSchema: {},
  }, async () => ({ content: [{ type: 'text', text: json({ widgets: bridge.listClients() }) }] }));

  server.registerTool('streambim_execute_js', {
    title: 'Run JavaScript in the StreamBIM widget',
    description: `Execute JavaScript inside the StreamBIM widget iframe (an async function body; use await and return a value).
In scope:
- api: StreamBIM widget API (e.g. await api.getFloors(), await api.colorCodeObjects({guid:'#ff0000'}), await api.takeScreenshot())
- rest(path, {method, body, accept, contentType}): authenticated StreamBIM REST call; JSON responses are parsed. '{projectId}' in path is replaced.
- ctx: { projectId, buildingId, userEmail, state } where state is an object that persists between runs
- console.log/warn/error: captured and returned
- panel: the widget pane's <div> for rendering your own UI (panel.innerHTML = ...)
- events: recent viewer events (pickedObject etc.)
- sleep(ms)
Returned data: URLs of images (e.g. screenshots) are returned as images. Large results are truncated - return summaries, not 10k objects.`,
    inputSchema: {
      code: z.string().describe('Async function body. Example: const f = await api.getFloors(); return f;'),
      timeoutMs: z.number().int().min(100).max(300000).optional().describe('Default 30000'),
      clientId: clientIdArg,
    },
  }, ({ code, timeoutMs = 30000, clientId }) => run(async () => toContent(await bridge.request('exec', { code }, { clientId, timeoutMs }))));

  server.registerTool('streambim_call', {
    title: 'Call a StreamBIM widget API method',
    description: `Call one StreamBIM.API method with positional args. Known methods: ${WIDGET_METHODS.join(', ')}. See streambim_docs for signatures.`,
    inputSchema: {
      method: z.string().describe('Method name, e.g. "gotoObject"'),
      args: z.array(z.any()).optional().describe('Positional arguments, e.g. ["2O2Fr$t4X7Zf8NOew3FLOH"]'),
      timeoutMs: z.number().int().optional(),
      clientId: clientIdArg,
    },
  }, ({ method, args = [], timeoutMs = 30000, clientId }) => run(async () => toContent(await bridge.request('call', { method, args }, { clientId, timeoutMs }))));

  server.registerTool('streambim_screenshot', {
    title: 'Screenshot the StreamBIM 3D view',
    description: 'Capture the current 3D view as a PNG (StreamBIM.API.takeScreenshot) and return it as an image.',
    inputSchema: { clientId: clientIdArg },
  }, ({ clientId }) => run(async () => toContent(await bridge.request('call', { method: 'takeScreenshot', args: [] }, { clientId, timeoutMs: 30000 }))));

  server.registerTool('streambim_rest', {
    title: 'StreamBIM REST request',
    description: `Authenticated request to the StreamBIM backend via makeApiRequest, using the signed-in user's session. Path examples: '/project-{projectId}/api/v1/ifc-searches' (POST, contentType 'application/json', body {rules:[[{buildingId:'1000', propKey:'@kind', propValue:'Window'}]]}), '/mgw/api/v3/projects/{projectId}'. '{projectId}' is replaced with the current project. JSON responses are parsed. Endpoints are documented (unofficially) in streambim_docs under api/.`,
    inputSchema: {
      path: z.string(),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
      body: z.any().optional(),
      accept: z.string().optional(),
      contentType: z.string().optional(),
      clientId: clientIdArg,
    },
  }, ({ path, method = 'GET', body, accept, contentType, clientId }) => run(async () =>
    toContent(await bridge.request('rest', { path, opts: { method, body, accept, contentType } }, { clientId, timeoutMs: 60000 }))));

  server.registerTool('streambim_get_events', {
    title: 'Read viewer events',
    description: 'Events from the viewer: pickedObject {guid, point}, cameraChanged, floorChanged, spacesChanged. Pass sinceSeq from the previous call to only get new ones; waitMs to wait for the user to click something.',
    inputSchema: {
      sinceSeq: z.number().int().optional(),
      names: z.array(z.enum(['pickedObject', 'cameraChanged', 'floorChanged', 'spacesChanged', 'didExpand', 'didContract', 'openuiAction'])).optional(),
      waitMs: z.number().int().min(0).max(120000).optional(),
      limit: z.number().int().optional(),
    },
  }, async (args) => ({ content: [{ type: 'text', text: json(await bridge.getEvents(args)) }] }));

  server.registerTool('streambim_render_panel', {
    title: 'Render HTML in the widget pane',
    description: 'Replace the agent area of the widget pane with HTML (tables, legends, buttons). Inline <script> tags are executed with `api` in scope, so buttons can drive the viewer. Pass empty string to clear.',
    inputSchema: { html: z.string(), clientId: clientIdArg },
  }, ({ html, clientId }) => run(async () => toContent(await bridge.request('render', { html }, { clientId, timeoutMs: 10000 }))));

  server.registerTool('streambim_render_openui', {
    title: 'Render OpenUI in the widget',
    description: `Render generative UI written in OpenUI Lang (https://www.openui.com) in the StreamBIM widget pane: cards, tables, charts, metrics, forms, buttons. Call streambim_openui_spec once first to get the component catalog and language rules.
OpenUI Lang: one statement per line, \`name = Component(args)\`, entry statement \`root\`. Example:
root = Card([title, stats, btn])
title = TextContent("Door inspection")
stats = ...
btn = Button("Show deviations", @OpenUrl("streambim://colorCodeObjects/%7B%22<guid>%22%3A%22e5484d%22%7D"))
Viewer control from buttons: @OpenUrl("streambim://<method>/<arg1>/<arg2>") calls StreamBIM.API.<method>(...args); each arg is URL-encoded and JSON-parsed if it looks like JSON. Other actions (@ToAssistant, @OpenUrl to web pages) arrive as "openuiAction" events in streambim_get_events.`,
    inputSchema: {
      openui: z.string().describe('OpenUI Lang program (must define root)'),
      append: z.boolean().optional().describe('Append statements to the current program instead of replacing it'),
      streamMs: z.number().int().min(0).max(2000).optional().describe('Reveal line by line with this delay, like a streaming LLM response'),
      clientId: clientIdArg,
    },
  }, ({ openui, append, streamMs, clientId }) => run(async () =>
    toContent(await bridge.request('openui', { source: openui, append, streamMs }, { clientId, timeoutMs: 120000 }))));

  server.registerTool('streambim_openui_spec', {
    title: 'OpenUI component catalog',
    description: 'Returns the OpenUI component library available in the widget (component signatures) and the full OpenUI Lang system prompt generated from it. Read it before writing OpenUI.',
    inputSchema: { includePrompt: z.boolean().optional().describe('Include the full system prompt (default true)'), clientId: clientIdArg },
  }, ({ includePrompt = true, clientId }) => run(async () =>
    toContent(await bridge.request('openui-spec', { prompt: includePrompt }, { clientId, timeoutMs: 60000 }))));

  server.registerTool('streambim_docs', {
    title: 'Search StreamBIM docs',
    description: 'Search or read the bundled docs: widget/README.md (verified widget API index), widget/methods/<name>.md (one page per method, with live-tested examples and output), widget/guides/rest-api-from-widgets.md, widget/guides/annotations-custom-objects.md, widget/guides/checklists-and-colour-by-value.md, widget/events.md, api/*.md (unofficial REST API: ifc-searches, topics, documents, projects, attachments, bcf, ...). Give `query` to search sections, `path` to read a file, or nothing to list files.',
    inputSchema: {
      query: z.string().optional(),
      path: z.string().optional(),
      offset: z.number().int().optional().describe('Character offset when reading a long file'),
    },
  }, async ({ query, path, offset = 0 }) => {
    if (path) {
      const doc = docs.find((d) => d.path === path || d.path.endsWith('/' + path));
      if (!doc) return toError(new Error(`Unknown doc ${path}`));
      const chunk = doc.text.slice(offset, offset + 20000);
      const more = offset + chunk.length < doc.text.length ? `\n\n[... ${doc.text.length - offset - chunk.length} more chars, call again with offset=${offset + chunk.length}]` : '';
      return { content: [{ type: 'text', text: chunk + more }] };
    }
    if (query) {
      const hits = searchDocs(docs, query);
      return { content: [{ type: 'text', text: hits.length ? hits.map((h) => `### ${h.path} — ${h.heading}\n${h.text}`).join('\n\n---\n\n') : 'No matches. Try fewer/other terms, or list files.' }] };
    }
    return { content: [{ type: 'text', text: json(docs.map((d) => ({ path: d.path, title: d.title, chars: d.text.length }))) }] };
  });

  for (const doc of docs) {
    server.registerResource(doc.path, `streambim-docs://${doc.path}`, { title: doc.title, mimeType: 'text/markdown' },
      async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: doc.text }] }));
  }

  server.registerPrompt('streambim_colorcode_by_property', {
    title: 'Colour-code the model by a property',
    description: 'Ask the agent to colour-code objects of a kind by a property value with a legend.',
    argsSchema: { kind: z.string().describe('e.g. Wall, Door, Space'), property: z.string().describe('e.g. Pset_WallCommon~FireRating') },
  }, ({ kind, property }) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `In the connected StreamBIM viewer, find all ${kind} objects, read "${property}" for each, assign one distinct hex colour per value, apply colorCodeObjectsWithLegends with a legend, then take a screenshot and summarise the counts per value.` } }],
  }));

  return server;
}
