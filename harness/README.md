# Agent harness: MCP server + StreamBIM widget

Let any MCP client (Claude Code, Claude Desktop, Cursor, …) drive a **live StreamBIM viewer**.
The agent writes JavaScript that runs inside a StreamBIM widget with the widget API in scope,
calls the REST API with the user's session, takes screenshots, reads click events and renders
generative UI. [Back to the kit](../README.md)

```
 MCP client ──/mcp (HTTP) or stdio──▶  node server  ──WebSocket /bridge──▶  widget iframe  ──penpal──▶  StreamBIM viewer
 (Claude etc.)                         localhost:3000                       (http://localhost:3000/)      (app.streambim.com)
```

A browser page can't accept MCP connections, so the MCP server is a small local Node process.
The widget in the StreamBIM panel is its "hands": it holds the StreamBIM connection and runs
what the agent sends.

## Run

```bash
npm install          # also copies penpal + the OpenUI bundle into widget/vendor/
npm start            # widget + MCP on http://localhost:3000
```

1. Open a StreamBIM project that has the **localhost** widget enabled (it loads `http://localhost:3000/`):
   `https://app.streambim.com/webapp/default/#/viewer/objectinfo/widget/localhost?projectId=<id>`
2. The panel shows **StreamBIM connected** and **MCP bridge connected**.
3. Connect your MCP client:

```bash
claude mcp add --transport http streambim http://localhost:3000/mcp
```

(Claude Code started in the repo root finds it through `.mcp.json`.) Clients that only speak
stdio can launch `node server/index.mjs --stdio`, which also serves the widget on port 3000.
Run one instance per port. `PORT` and `HOST` override `3000` / `127.0.0.1`.

| npm script | |
|---|---|
| `npm start` | Harness (widget + MCP) |
| `npm run example -- <dir>` | Serve another folder as the localhost widget, e.g. `../examples/minimal-widget` |
| `npm run status` | Quick MCP client check: lists tools and connected widgets |
| `npm run verify` | Run every documented example live (see Contributing in the root README) |
| `npm run build-docs` | Regenerate `../widget/` from the spec and verification results |

## MCP tools

| Tool | What it does |
|------|--------------|
| `streambim_status` | Connected widgets: project, building, user, connection state. Start here. |
| `streambim_execute_js` | Run an async JS function body in the widget. In scope: `api`, `rest()`, `ctx`, `console`, `panel`, `events`, `sleep`. |
| `streambim_call` | Call one widget API method with positional args. |
| `streambim_screenshot` | `takeScreenshot()`, returned as an image the model can see. |
| `streambim_rest` | Authenticated REST call through the viewer session (`{projectId}` is substituted). |
| `streambim_get_events` | `pickedObject`, `cameraChanged`, `floorChanged`, `spacesChanged`, `openuiAction`; `waitMs` waits for the user. |
| `streambim_render_panel` | Put HTML in the widget panel; inline `<script>`s run with `api` in scope. |
| `streambim_render_openui` | Render [OpenUI](https://www.openui.com) Lang (cards, metrics, tables, charts, forms, buttons), optionally streamed. Buttons can call widget API methods. See [../openui](../openui/README.md). |
| `streambim_openui_spec` | The OpenUI component catalog and the system prompt for writing OpenUI Lang. |
| `streambim_docs` | Search or read this repo's docs (`api/`, `widget/`, `openui/`). Also exposed as MCP resources. |

The server also sends agents instructions with the main traps (never-resolving methods,
colour support, REST quirks).

### What an agent sends to `streambim_execute_js`

```js
// Colour rooms per floor with custom colours (works in every flavour)
const spaces = await api.findObjects({ key: '@kind', value: 'Space', limit: 500 });
const infos = await Promise.all(spaces.map((g) => api.getObjectInfo(g)));
const palette = ['#e5484d', '#30a46c', '#3e63dd', '#f5d90a'];
const floors = [...new Set(infos.map((i) => i.properties['@Building Storey']?.Name))];
await api.colorCodeSpaces(Object.fromEntries(spaces.map((g, n) => [g, palette[floors.indexOf(infos[n].properties['@Building Storey']?.Name) % palette.length]])));
await api.zoomToSearchResult();
return floors;
```

```js
// REST: IFC search + export through the user's session
const { searchId } = await rest('/project-{projectId}/api/v1/ifc-searches', {
  method: 'POST',
  body: { rules: [[{ buildingId: ctx.buildingId, propKey: '@kind', propValue: 'Window' }]] },
});
const fields = btoa('GUID|Name');
return (await rest(`/project-{projectId}/api/v1/ifc-searches/export/json?searchId=${searchId}&fieldUnion=true&fieldNames=${fields}&page[limit]=100&page[skip]=0`)).data;
```

## Tools folder

| Script | |
|---|---|
| `tools/run-js.mjs <file.js>` | Run a local JS file in the connected widget with `StreamBIM.API` in scope, which is handy while developing |
| `tools/openui-door-report.mjs` | Door query → OpenUI door report in the widget |
| `tools/demo-openui-checklist.mjs ["Checklist name"]` | Checklist → OpenUI dashboard whose buttons colour rooms |
| `tools/probe-widget-api.mjs` | Call every widget method raw: resolve / reject / never settles |
| `tools/verify-examples.mjs` | Run every example in `../widget/spec` live → `../widget/verification/examples-<date>.json` |
| `tools/sweep-rest.mjs` | Which REST GET endpoints work through `makeApiRequest`, with which Accept |
| `tools/discover-flavours.mjs` | Find `/webapp/<flavour>/` builds and compare their widget API |
| `tools/extract-widget-methods.mjs <bundle> <out>` | Pull StreamBIM's host-side method table out of its JS bundle |
| `tools/build-widget-docs.mjs` | Generate `../widget/` pages |

## Security

This runs agent-written JS with the signed-in user's StreamBIM session. That's the point,
so it's meant for local development and hackathons:

- HTTP binds to `127.0.0.1`. `/mcp` rejects non-local `Host` headers and foreign browser `Origin`s (DNS-rebinding guard).
- `/bridge` only accepts WebSockets from the widget page's own origin.
- Penpal only talks to the StreamBIM parent origin.
- The **Agent control** switch in the panel refuses all agent requests while it's off, and every run shows in the Activity log.
- Tools that write to the project (`verify -- --include-writes`, the checklist guide's examples) are opt-in. Run them on a test project.

## Layout

```
server/index.mjs   HTTP server: static widget, /vendor, /bridge WebSocket, /mcp, --stdio, --serve <dir>
server/bridge.mjs  request/response + event buffer between MCP and widget(s)
server/mcp.mjs     tools, resources, agent instructions
server/docs.mjs    doc loader + section search over ../api, ../widget, ../openui
widget/            the agent widget page (index.html, widget.js, widget.css; vendor/ is generated)
tools/             scripts listed above
test/smoke.mjs     minimal MCP client: node test/smoke.mjs <tool> '<json args>'
```
