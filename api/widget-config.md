# StreamBIM project widget configuration

> **Unofficial.** Schema observed from production project configs (e.g. multi-widget setups with dRofus, Teknisk Beskrivning, IDS, Drift & underhåll). StreamBIM configures this **per project** on the server side — it is **not** part of the [streambim-widget-api](https://github.com/streambim/streambim-widget-api) npm package. Contact **support@rendra.io** to register widgets and apply config.

This document describes how StreamBIM wires **contextual external links** and **embedded widgets** to IFC object properties, and how that relates to the [Widget API](widget-api.md) and [IFC searches](ifc-searches.md).

---

## Two layers of “widgets”

| Layer | What it is | You control |
|-------|------------|-------------|
| **Project widget config** (this doc) | JSON listing `widgets` + `sources`; StreamBIM opens URLs or iframes when the user inspects objects | Property mappings (`lookups`), base URLs, widget registry — via StreamBIM support |
| **Widget API** ([widget-api.md](widget-api.md)) | JavaScript SDK inside your widget iframe (`StreamBIM.API.*`) | Your app code after `connectToParent` |

A single product often needs **both**: config so StreamBIM knows *when* and *with which query params* to open your app, and the Widget API so your app can *drive the 3D viewer*.

---

## Top-level shape

```json
{
  "version": 1,
  "widgets": [ /* widget registry */ ],
  "sources": [ /* contextual links / embed targets */ ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Config schema version (observed: `1`) |
| `widgets` | array | Registered widget apps (origins, auth, postMessage keys) |
| `sources` | array | Rules for showing a link or embed when an object matches |

---

## `widgets[]` — widget registry

Each entry describes an external app StreamBIM may embed or link to.

### Simple widget (custom HTML app)

```json
{
  "id": "byggstyrning",
  "name": "Teknisk Beskrivning",
  "rootUrl": "https://example.com/my-widget/",
  "messageKey": "ByggstyrningEmbedded"
}
```

| Field | Description |
|-------|-------------|
| `id` | Stable key referenced by `sources[].widget` |
| `name` | Label shown in the StreamBIM UI |
| `rootUrl` | Origin of the widget app (must be **whitelisted**) |
| `messageKey` | Identifier for host↔widget messaging (paired with embed integration; related to but distinct from Penpal/`streambim-widget-api`) |

### OAuth / embedded partner widget (e.g. dRofus)

```json
{
  "id": "drofus",
  "name": "Embedded dRofus",
  "messageKey": "DrofusEmbedded",
  "appServer": "https://web-eu.example.com",
  "authority": "https://ids-eu.example.com",
  "client_id": "embed/streambim",
  "response_type": "token",
  "scope": "dr-std",
  "extraQueryParams": {
    "db": "project-db",
    "pr": "01"
  }
}
```

Partner-specific auth fields are passed through to the embedded app’s login flow. Exact semantics depend on the partner (dRofus, etc.).

**Examples from real configs:** `idswidget` (`rootUrl` + `messageKey`), `dou` / `douwidget`, `drofus` with EU vs tenant-specific `appServer` / `authority` / `extraQueryParams`.

---

## `sources[]` — contextual connections

A **source** defines: *when the user focuses an object, open this URL (or embed this widget) and pass these query parameters extracted from IFC properties.*

```json
{
  "name": "dRofus room",
  "widget": "drofus",
  "embed": true,
  "url": {
    "baseUrl": "https://web-eu.example.com/embedded/#/rooms/search"
  },
  "lookups": [
    {
      "key": "value",
      "kindPattern": "^Space$",
      "relativeUrl": "",
      "patterns": [
        {
          "property": "Name and Numbers: Room ID",
          "pset": "StreamBIM"
        }
      ]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `name` | Display name for the link/tab in StreamBIM |
| `widget` | Must match `widgets[].id` |
| `embed` | `true` = open inside StreamBIM panel (iframe); `false` = external navigation (behavior may vary by StreamBIM version) |
| `url.baseUrl` | Base URL; lookup values are appended as query parameters |
| `lookups` | Rules for building query string (and optional kind filter) |

### Multiple sources, one widget

The same `widget` id can appear in several `sources` with different `baseUrl` and `lookups` (e.g. dRofus **room** vs **occurrence** vs **article**, or two DOU entries for room vs contract).

### Multiple patterns (fallback chain)

StreamBIM can try several property locations for the same lookup key:

```json
"patterns": [
  { "property": "dRofus Id", "pset": "Other" },
  { "property": "drofus_occurrence_id", "pset": "StreamBIM" },
  { "property": "drofus_occurrence_id", "pset": "Other" }
]
```

First non-empty match wins (observed behavior in configs; confirm with StreamBIM if critical).

---

## `lookups[]` — property → query param

| Field | Description |
|-------|-------------|
| `key` | Query parameter name sent to `baseUrl` (e.g. `value`, `room_id`, `contractid`) |
| `kindPattern` | Optional regex on IFC **kind** (e.g. `^Space$` — only for spaces) |
| `patterns` | List of `{ "property", "pset" }` — where to read the value on the picked object |
| `relativeUrl` | Optional path segment appended to `baseUrl` (often `""`) |

### Example: space → room widget

- **kindPattern:** `^Space$` — only when picked object is a Space.
- **property / pset:** `Name and Numbers: Room ID` in pset `StreamBIM` → query `?value=<roomId>` (when `key` is `value`).

### Example: any object → occurrence search

No `kindPattern`; patterns read `dRofus Id` / `drofus_occurrence_id` from `Other` or `StreamBIM` psets → opens occurrence search with `key=value`.

### Example: BIP property → external TB widget

```json
{
  "key": "value",
  "patterns": [{ "property": "BSABe", "pset": "BIP" }]
}
```

`baseUrl` points at a Teknisk Beskrivning widget; `widget` id references the registered app.

### Example: contract-based DOU link

```json
{
  "key": "contractid",
  "patterns": [{ "property": "ContractID", "pset": "BIP" }]
}
```

Different `key` names produce different query strings for the same widget family (`dou`).

---

## Connection to StreamBIM queries & Widget API

The same **property set + property name** strings used in widget config appear everywhere else in StreamBIM automation.

| Widget config | Widget API | REST / IFC search |
|---------------|------------|-------------------|
| `patterns[].pset` + `patterns[].property` | `getObjectInfo(guid)` → `result.properties` keys (often `"Pset~Property"` or display names) | [ifc-searches.md](ifc-searches.md): `psetName`, `propKey` in rules |
| `kindPattern` `^Space$` | — | Search rule `propKey: '@kind'`, `propValue: 'Space'` |
| Lookup `key` → URL param | Your widget reads `URLSearchParams` on load | — |
| — | `valuesForObjectProperty('PsetName~propKey')` | Distinct values for building UIs |
| — | `findObjects({ key, value })` | Simple property filter |
| — | `applyObjectSearch({ filter: { rules: [[...]] } } })` | Advanced rules (same as viewer search) |

### Discovering property names for `lookups`

1. **In the viewer:** Pick an object → inspect properties in StreamBIM UI; note **pset** and **property** labels.
2. **Widget API:** After connect, `await StreamBIM.API.getObjectInfo(guid)` and inspect `properties`.
3. **Network tab:** Run a search in StreamBIM → copy payload from `ifc-searches` (see [ifc-searches.md](ifc-searches.md)).
4. **Widget API escape hatch:** `StreamBIM.API.makeApiRequest` to POST `/pgw/project-{id}/api/v1/ifc-searches` with trial rules.

If a lookup never populates, the pset/property name in config usually does not match the model (wrong pset, renamed export, or value only on type vs occurrence).

### Aligning config with a search

Config lookup:

```json
{ "property": "ContractID", "pset": "BIP" }
```

Equivalent in-widget search (illustrative):

```javascript
await StreamBIM.API.applyObjectSearch({
  filter: {
    rules: [[{
      buildingId: '1000',
      psetName: 'BIP',
      propKey: 'ContractID',
      propValue: '<contract id from pick>',
      operator: '='
    }]]
  }
}, true);
```

Use the same `pset`/`property` (or `psetName`/`propKey`) names in both places.

---

## Multi-tenant / project variants

Configs are **per StreamBIM project** (or template). A second project may use the same `widgets[].id` but different:

- `url.baseUrl` (tenant-specific host),
- `patterns` (e.g. `KVA-TBG` pset with `dRofus_Rum_ID` instead of `StreamBIM` / `Name and Numbers: Room ID`),
- OAuth `extraQueryParams.db` / `pr`.

Always validate lookups against **that project’s** exported IFC properties.

---

## Checklist for new `sources` entry

1. Register widget in `widgets[]` (`id`, `rootUrl`, whitelist with StreamBIM).
2. Add `sources[]` with `name`, `widget`, `embed`, `url.baseUrl`.
3. Define `lookups` with correct `pset` / `property` (verify via `getObjectInfo` or ifc-search).
4. Add `kindPattern` if the link only applies to Spaces (or other kinds).
5. Implement widget app: read query param (`key`), call `StreamBIM.connectToParent` + `StreamBIM.API` as needed.
6. Test pick on representative objects (space, occurrence, type, missing property).

---

## Related

- [widget-api.md](widget-api.md) — JavaScript SDK
- [ifc-searches.md](ifc-searches.md) — REST search/export (same property model)
- [AGENTS.md](../AGENTS.md) — which doc to open first
