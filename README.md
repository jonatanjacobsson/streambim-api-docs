# StreamBIM developer kit (unofficial)

Everything you need to build **StreamBIM widgets** and **AI agents that drive StreamBIM**:
verified widget API docs, unofficial REST API docs, copy-paste example widgets, and a local
MCP server that lets Claude, Cursor or any MCP client control a live StreamBIM viewer.

> Unofficial and community-maintained. Not affiliated with Rendra / StreamBIM. Everything in
> `widget/` was tested against app.streambim.com on 2026-11-01, and each example on those
> pages shows its real output.

| Folder | What's in it |
|---|---|
| [`widget/`](widget/README.md) | **Widget API reference.** One page per method (55), with what StreamBIM really does, real errors, and live-tested examples. Plus guides: [REST from a widget](widget/guides/rest-api-from-widgets.md), [checklists + colour by value](widget/guides/checklists-and-colour-by-value.md), [annotations](widget/guides/annotations-custom-objects.md), [events](widget/events.md) |
| [`api/`](api/README.md) | **REST API reference** (unofficial): auth, projects, topics, checklists, documents, IFC searches, BCF, … |
| [`examples/`](examples/README.md) | **Standalone widgets** to copy: minimal starter, colour by checklist answer, OpenUI dashboard |
| [`harness/`](harness/README.md) | **Agent harness**: local MCP server + "localhost" widget. Agents run JS in the viewer, call the REST API and render UI |
| [`openui/`](openui/README.md) | **Generative UI** with [OpenUI](https://www.openui.com): agents render dashboards, tables and charts in the widget, and their buttons drive the viewer |

## Quickstart (10 minutes)

**You need:** Node 20+, Chrome or Edge, and a StreamBIM project where the **`localhost`
widget** is enabled. That widget simply loads `http://localhost:3000/` in the side panel.
Widgets are enabled per project by Rendra (`support@rendra.io`); hackathon organisers usually
set this up for you.

```bash
git clone https://github.com/jonatanjacobsson/streambim-api-docs.git
cd streambim-api-docs/harness
npm install
```

### A. Run an example widget

```bash
npm run example -- ../examples/minimal-widget
```

Open your project with the localhost widget:

```
https://app.streambim.com/webapp/default/#/viewer/objectinfo/widget/localhost?projectId=<PROJECT_ID>
```

The side panel shows the widget, connected to the viewer. Click a button, or click an object
in 3D. Edit `examples/minimal-widget/index.html` and reload the panel. That's your widget.

### B. Let an AI agent drive the viewer

```bash
npm start                      # widget + MCP server on http://localhost:3000
```

Open the same project URL. The panel shows **Agent Bridge** with *StreamBIM connected* and
*MCP bridge connected*. Then connect your agent:

```bash
claude mcp add --transport http streambim http://localhost:3000/mcp   # Claude Code
```

Claude Code started in this repo picks it up automatically from [`.mcp.json`](.mcp.json).
Other MCP clients: point them at `http://localhost:3000/mcp` (Streamable HTTP), or launch
`node harness/server/index.mjs --stdio`.

Then ask things like:

- *"Colour all rooms by floor and take a screenshot"*
- *"Run a door query and show me a dashboard of door types"*
- *"Which checklists exist in this project? Colour the rooms by the answers of the first one"*

## Build a widget in 5 lines

```html
<script src="https://cdn.jsdelivr.net/npm/penpal@7.0.6/dist/penpal.min.js"></script>
<script>
  const messenger = new Penpal.WindowMessenger({ remoteWindow: window.parent, allowedOrigins: [location.ancestorOrigins[0]] });
  Penpal.connect({ messenger, methods: { pickedObject: (e) => console.log('clicked', e.guid) } }).promise
    .then(async (api) => console.log(await api.getProjectId(), await api.getFloors()));
</script>
```

The official `streambim-widget-api` helper's `connectToParent` **fails inside StreamBIM**
(`document.referrer` is empty), so talk penpal directly as above. Details:
[connecting a widget](widget/README.md#connecting-a-widget).

Going further:

- **Agent-oriented guide:** [AGENTS.md](AGENTS.md)
- **Official SDK summary and ecosystem repos:** [api/widget-api.md](api/widget-api.md) (superseded by `widget/` where they disagree)
- **Project widget config** (`sources`, `lookups`, query params): [api/widget-config.md](api/widget-config.md)
- **Community catalog:** [StreamBIM Marketplace](https://streambim-marketplace.vercel.app/?widget=true)

Shipping a widget needs the **WIDGET** project feature and URL whitelisting (`support@rendra.io`).
For server-side automation without a 3D viewer, use the [REST API](api/README.md) instead.

## Things that will save you an hour

Verified on app.streambim.com (default flavour), 2026-11-01:

1. **Rejections are `{ code, debug }`**, not `{ code, detail }`. `debug` may be a cloned `Error`.
2. **These never resolve** (don't `await` them): `setCameraPosition`, `deHighlightAllObjects`, `applyStyles`. `deHighlightObject` always fails.
3. **Custom colours:** `colorCodeSpaces({ guid: '#rrggbb' })` works. `colorCodeObjects` draws everything in search green on the default flavour; objects take your colours only in the **taskctrl** flavour via `colorCodeObjectsWithLegends`. See [flavours](widget/README.md#flavours).
4. **`makeApiRequest`**: use `/project-{id}/api/v1/v2/...` (JSON:API, default Accept) or `/project-{id}/api/v1/...` (`contentType: 'application/json'`). **201 and 204 responses arrive as a `DataCloneError`** even though the write succeeded, and real HTTP errors look the same. See [REST from a widget](widget/guides/rest-api-from-widgets.md).
5. **Colour updates take ~200–400 ms** to show (each call re-runs a search). That's about 2–3 steps per second for animation.
6. **Checklist answers** live in `checklist-item-instances`, which the server creates from the checklist's IFC query. You PATCH them (full record); you can't POST them. See [the checklist guide](widget/guides/checklists-and-colour-by-value.md).
7. **Debug in a normal browser.** The widget's console is inside a cross-origin iframe: select the `localhost` frame in DevTools. The Claude desktop app's built-in browser blocks `localhost`.
8. Seven methods in the official README don't exist on the default webapp (`highlightSystem`, `toggleShowAllFloors`, …). [Full list of corrections](widget/README.md#corrections-to-the-official-readme).

## Repository layout

```
api/                 REST API reference (markdown, one file per area)
widget/              widget API reference (generated: edit widget/spec/*.mjs, then npm run build-docs)
  methods/           one page per method
  guides/            REST from widgets, checklists + colour by value, annotations
  spec/              source of truth: method specs + runnable examples
  verification/      raw results of the live test runs (probe, examples, REST sweep, flavours)
examples/            standalone widgets (served with `npm run example -- ../examples/<name>`)
harness/             MCP server, agent widget, verification tools
openui/              OpenUI generative UI in the widget
```

## Contributing

Docs are **verified, not written from memory**. To add or fix a widget page, edit
`widget/spec/methods.mjs` or `widget/spec/guides.mjs`, open a project with the harness
widget, then:

```bash
cd harness
npm run verify -- --only <methodName>   # runs the examples in the live viewer
npm run build-docs                      # regenerates widget/ (fails if an example has no passing run)
```

REST pages in `api/` are plain markdown. PRs with corrections from real usage are very welcome.
