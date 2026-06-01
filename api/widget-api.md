# StreamBIM Widget API

JavaScript library for interacting with the StreamBIM 3D viewer from within an embedded widget or by embedding StreamBIM in your own page/app.

**Official source:** [github.com/streambim/streambim-widget-api](https://github.com/streambim/streambim-widget-api) (MIT, Rendra AS) — **v3.0.0** on `master` (Penpal 7, `StreamBIM.API` namespace).

**Agent entry point:** [AGENTS.md](../AGENTS.md) · **Community widgets:** [StreamBIM Marketplace](https://streambim-marketplace.vercel.app/?widget=true)

---

## Agent quick reference

Read this section first when implementing or documenting a widget.

### Choose an integration mode

| Mode | Connect with | Your app runs… |
|------|----------------|----------------|
| Widget in StreamBIM | `StreamBIM.connectToParent(window, callbacks)` | Inside an iframe panel in StreamBIM |
| Embedded viewer | `StreamBIM.connectToChild(iframe, callbacks)` | On your page; StreamBIM is the iframe |
| Popup window | `StreamBIM.connectToWindow(win, url, callbacks)` | On your page; StreamBIM is a separate window |

All viewer commands go through **`StreamBIM.API.<method>()`** after the connect promise resolves. Every method returns a `Promise`.

### Bootstrap template (widget inside StreamBIM)

```javascript
import StreamBIM from 'streambim-widget-api';

await StreamBIM.connectToParent(window, {
  pickedObject({ guid, point }) { /* handle pick */ },
  beforeInit() {
    StreamBIM.API.setStyles('.message-container { background: white; }');
    StreamBIM.API.setNavigationMode(1);
  },
});

const projectId = await StreamBIM.API.getProjectId();
const email = await StreamBIM.API.getUserEmail();
```

### When to use REST instead

| Need | Use |
|------|-----|
| Highlight, camera, in-viewer search visualization | Widget API (`StreamBIM.API.*`) |
| Create topics, upload IFC, converter jobs, org admin | REST — [README.md](../README.md) |
| IFC search/export from inside the viewer without a separate token | `StreamBIM.API.makeApiRequest` → [ifc-searches.md](ifc-searches.md) |

### Error handling

```javascript
try {
  await StreamBIM.API.highlightObject(guid);
} catch (e) {
  // e.code: invalid | notFound | unknown | unauthorized | notAllowed
  // e.detail: debug info
}
```

### Prerequisites (not optional)

1. **WIDGET** feature enabled on the StreamBIM project.
2. Widget origin URL **whitelisted** by StreamBIM (contact **support@rendra.io**).
3. Viewer URL must include **`embedded=true`** for embedded/popup modes.

---

## Method index (v3)

Catalog derived from the official repo demos (`demo_embedded`, `demo_2`, `demo_window`) and README. Beta methods need the `taskctrl` webapp flavor — see [Beta Methods](#beta-methods).

| Method | Category | Notes |
|--------|----------|-------|
| `setAuthToken` | Auth | Call in `beforeInit` for custom Bearer auth |
| `getProjectId` | Project | |
| `getUserEmail` | Project | |
| `getBuildingId` | Project | |
| `getCameraState` | Camera | |
| `setCameraState` | Camera | |
| `setCameraPosition` | Camera | |
| `getViewportState` | Camera | Includes hidden/highlighted objects, layers, clipping |
| `setViewportState` | Camera | |
| `applyViewpoint` | Camera | Saved viewpoint shortcut |
| `gotoObject` | Navigation | |
| `gotoSpace` | Navigation | |
| `gotoFloor` | Navigation | |
| `goHome` | Navigation | |
| `highlightObject` | Visibility | |
| `deHighlightObject` | Visibility | |
| `deHighlightAllObjects` | Visibility | |
| `hideObject` | Visibility | |
| `showObject` | Visibility | |
| `showAllObjects` | Visibility | |
| `highlightSystem` | Visibility | Beta (`taskctrl`) |
| `getObjectInfo` | Info | |
| `getFloors` | Info | |
| `getSpaces` | Info | Spaces under current camera |
| `valuesForObjectProperty` | Info | Distinct values for `psetName~propKey` |
| `findObjects` | Search | Does not change viewer selection |
| `applyObjectSearch` | Search | Active selection in viewer |
| `getObjectInfoForSearch` | Search | |
| `resetObjectSearch` | Search | |
| `setSearchVisualizationMode` | Search | `HIDDEN`, `FADED`, `ORIGINAL` |
| `zoomToSearchResult` | Search | |
| `quickSearch` | Search | Freetext |
| `colorCodeObjects` | Color | GUID → hex |
| `colorCodeObjectsWithLegends` | Color | Beta |
| `colorCodeSpaces` | Color | |
| `colorCodeSpacesWithLegends` | Color | Beta |
| `colorCodeByProperty` | Color | Pass `null` to reset |
| `getLayers` | Layers | |
| `setLayers` | Layers | |
| `showGrids` | Layers | |
| `hideGrids` | Layers | |
| `takeScreenshot` | Media | PNG data URL |
| `getMapImage` | Media | `{ width, height, resolution }` |
| `getAnnotatedFloorplan` | Media | PDF from world position |
| `createObject` | Annotations | `{ center, name }` → GUID |
| `setStyles` | UI | Inject CSS into viewer |
| `setSkyColor` | UI | |
| `setNavigationMode` | UI | `0` walk, `1` orbit |
| `setExpanded` | UI | Widget panel fullscreen |
| `setShowExpandButton` | UI | |
| `toggleShowAllFloors` | UI | Multi-floor grid |
| `setViewLayout` | UI | Beta: `ALL_FLOORS`, `SMALL_2D` |
| `clipToFloor` | UI | Beta |
| `makeApiRequest` | Low-level | Authenticated REST from viewer context |
| `toggleHideNoResultsFloors` | UI | Seen in demos only; not in official README — treat as experimental |

**Callbacks** (second argument to `connect*`): `pickedObject`, `spacesChanged`, `floorChanged`, `cameraChanged`, `beforeInit`, `didExpand`, `didContract`.

---

## Widget ecosystem & GitHub connections

Inventory of repositories accessible to **jonatanjacobsson** and orgs **byggstyrning**, **BEAst-AB**, **PingstLSE** that relate to the Widget API (June 2026). Use these as reference implementations.

### Official

| Repository | Role |
|------------|------|
| [streambim/streambim-widget-api](https://github.com/streambim/streambim-widget-api) | Official SDK (v3), demos, `dist/streambim-widget-api.min.js` |
| [streambim-marketplace](https://streambim-marketplace.vercel.app/?widget=true) | Community widget catalog & developer guide |

### Your account (`jonatanjacobsson`)

| Repository | Visibility | Connection to Widget API |
|------------|------------|---------------------------|
| [streambim-api-docs](https://github.com/jonatanjacobsson/streambim-api-docs) | public | This unofficial REST + Widget reference |
| [streambim-widget-api](https://github.com/jonatanjacobsson/streambim-widget-api) | public | Fork of official SDK — track `upstream/master` |
| [n8n-nodes-streambim](https://github.com/jonatanjacobsson/n8n-nodes-streambim) | private | REST automation (complements widgets, not iframe SDK) |
| [douwidget](https://github.com/jonatanjacobsson/douwidget) | public | Widget project (name suggests StreamBIM widget) |

### Organization: `byggstyrning`

| Repository | Visibility | Marketplace / notes |
|------------|------------|---------------------|
| [idswidget](https://github.com/byggstyrning/idswidget) | public | **IDS Widget** — IDS validation in-browser (Pyodide); uses widget hosting |
| [streambim-cesium-widget](https://github.com/byggstyrning/streambim-cesium-widget) | private | **Topo Map** — Cesium terrain synced to StreamBIM camera |
| [streambimissuedashboard](https://github.com/byggstyrning/streambimissuedashboard) | private | Issue dashboard integration |
| [streambim-project-dashboard](https://github.com/byggstyrning/streambim-project-dashboard) | private | Project dashboard |
| [dewidget](https://github.com/byggstyrning/dewidget) | — | Delentreprenad Widget |
| [styrwidget](https://github.com/byggstyrning/styrwidget) | — | Styr widget |

### Community (linked from marketplace)

| Repository | Listed as |
|------------|-----------|
| [terjefjeldberg/IDS-SVV-widget](https://github.com/terjefjeldberg/IDS-SVV-widget) | IDS SVV Widget (Statens vegvesen) |

Marketplace also lists StreamBIM-maintained examples (**IFC Hierarchy**, **WMS Map**, **NVDB**) that may live in private or monorepo hosting — use marketplace cards for descriptions and contact authors.

### Suggested reading order for new widget authors

1. Official `demo_embedded/index.html` — full `StreamBIM.API` exercise UI.
2. Official `demo_2/index.html` — color coding, `makeApiRequest`, beta layout/clip.
3. [byggstyrning/idswidget](https://github.com/byggstyrning/idswidget) — production widget with heavy client-side logic.
4. This file’s [Complete Examples](#complete-examples) and REST cross-links.

---

## Overview

The Widget API provides a promise-based JavaScript interface to control the StreamBIM 3D viewer. It supports three integration modes:

| Mode | Method | Use Case |
|------|--------|----------|
| Widget inside StreamBIM | `connectToParent(window, callbacks)` | Your widget runs as an iframe inside the StreamBIM app |
| StreamBIM embedded in your page | `connectToChild(iframe, callbacks)` | You host StreamBIM in an iframe on your page |
| StreamBIM in a separate window | `connectToWindow(window, url, callbacks)` | You open StreamBIM in a popup/new window |

All API methods are accessed via `StreamBIM.API.*` and return Promises. On error, promises reject with `{ code: string, detail?: any }`.

## Integration Requirements

- Widgets must be **whitelisted** and enabled per StreamBIM project. Contact `support@rendra.io` to set up a custom widget.
- For OIDC authentication, provide your identity server details to StreamBIM. StreamBIM opens your login screen in a popup and persists the token per user across sessions.

---

## Install & Setup

### Include the library

**npm** (align with official `master`, currently **3.0.0**):

```bash
npm install streambim-widget-api
```

```javascript
import StreamBIM from 'streambim-widget-api';
```

**Script tag** — copy [`dist/streambim-widget-api.min.js`](https://github.com/streambim/streambim-widget-api/blob/master/dist/streambim-widget-api.min.js) into your app (StreamBIM does not host a public CDN):

```html
<script src="./vendor/streambim-widget-api.min.js"></script>
<script>
  StreamBIM.connectToParent(window, {}).then(function () {
    StreamBIM.API.getProjectId().then(console.log);
  });
</script>
```

Pin npm or vendor the file from a tagged release on [streambim/streambim-widget-api](https://github.com/streambim/streambim-widget-api).

### Embedded mode (StreamBIM in your iframe)

```html
<iframe id="streambim_target"
        src="https://{environment}.streambim.com/webapp/default/#/viewer?projectId={PROJECT_ID}&embedded=true">
</iframe>
```

```javascript
const iframe = document.getElementById('streambim_target');

StreamBIM.connectToChild(iframe, {
  pickedObject: function (result) {
    console.log('Clicked: ' + result.guid);
  }
}).then(function() {
  // StreamBIM.API is now available
  const projectId = await StreamBIM.API.getProjectId();
});
```

### Widget mode (your widget inside StreamBIM)

```javascript
StreamBIM.connectToParent(window, {
  pickedObject: function (result) {
    console.log('Clicked: ' + result.guid);
  }
}).then(function() {
  console.log('Connected!');
});
```

### Window mode (StreamBIM in a popup)

```javascript
const url = 'https://{environment}.streambim.com/webapp/default/#/viewer?projectId=' + projectId + '&embedded=true';
const childWindow = window.open(url, 'StreamBIMWindow', 'width=1200,height=800');

StreamBIM.connectToWindow(childWindow, url, {
  pickedObject: function (result) {
    console.log('Clicked: ' + result.guid);
  }
}).then(function() {
  console.log('Connected!');
});
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | Yes | StreamBIM project ID |
| `buildingId` | number | No | Target building within the project |
| `embedded` | boolean | Yes | Must be `true` for widget API to work |

### Webapp Flavors

The viewer URL can use different webapp flavors:

| Flavor | URL Pattern | Description |
|--------|-------------|-------------|
| `default` | `/webapp/default/#/viewer?...` | Standard viewer |
| `taskctrl` | `/webapp/taskctrl/#/viewer?...` | Includes beta features (see [Beta Methods](#beta-methods)) |

To use the `taskctrl` flavor, append `?forceFlavor=true` to the URL.

---

## Events (Callbacks)

Register callbacks in the second argument to any `connect*` method. All are optional.

### pickedObject(result)

Fires when the user clicks an object in the 3D scene.

**Callback argument:**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | string | IFC GUID of the clicked object |
| `point` | `[number, number, number]` | World-space `[x, y, z]` coordinates of the click point (may be absent) |

```javascript
pickedObject: function(result) {
  console.log('Object:', result.guid);
  if (result.point) {
    console.log('At:', result.point[0], result.point[1], result.point[2]);
  }
}
```

### spacesChanged(guids)

Fires when the camera enters or leaves an IFC space.

| Field | Type | Description |
|-------|------|-------------|
| `guids` | `string[]` | GUIDs of current space(s). Empty array means the camera left the building. |

### floorChanged(floorId)

Fires when the active floor changes.

| Field | Type | Description |
|-------|------|-------------|
| `floorId` | `string \| number` | ID of the new active floor |

### cameraChanged(cameraState)

Fires on camera state updates. Useful for persisting/restoring views.

| Field | Type | Description |
|-------|------|-------------|
| `cameraState` | `CameraState` | Full camera state object (position, target, up vectors, etc.) |

### beforeInit()

Hook called before the viewer initializes. Use this to set styles, sky color, navigation mode, hide UI elements, set auth tokens, and perform initial commands.

```javascript
beforeInit: function() {
  StreamBIM.API.setAuthToken('your-bearer-token');
  StreamBIM.API.setStyles('.message-container { background-color: white; }');
  StreamBIM.API.setSkyColor('white');
  StreamBIM.API.setNavigationMode(1);
}
```

### didExpand() / didContract()

Fires when the embedded widget is expanded or collapsed (widget mode only).

---

## API Reference

All methods are called on `StreamBIM.API` and return a `Promise`.

---

### Authentication

#### setAuthToken(token)

Provide a Bearer token for the embedded viewer to use for API requests. Typically called in `beforeInit`.

**`StreamBIM.API.setAuthToken(token: string): Promise<boolean>`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | Bearer token for API authentication |

---

### Project & User

#### getProjectId()

**`StreamBIM.API.getProjectId(): Promise<string>`**

Returns the current project ID.

#### getUserEmail()

**`StreamBIM.API.getUserEmail(): Promise<string>`**

Returns the logged-in user's email address.

#### getBuildingId()

**`StreamBIM.API.getBuildingId(): Promise<string>`**

Returns the current building ID within the project.

> **Note:** This method was added per [issue #23](https://github.com/streambim/streambim-widget-api/issues/23), released ~November 2025.

---

### Camera & Viewport

#### getCameraState()

**`StreamBIM.API.getCameraState(): Promise<CameraState>`**

Returns the current camera state (position, target, up vectors, etc.).

#### setCameraState(state)

**`StreamBIM.API.setCameraState(state: CameraState): Promise<boolean>`**

Restores a full camera state previously obtained from `getCameraState()`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | CameraState | Camera state object with position, target, up, etc. |

#### setCameraPosition(position)

**`StreamBIM.API.setCameraPosition(position: [number, number, number]): Promise<boolean>`**

Moves the camera to a world-space position.

| Parameter | Type | Description |
|-----------|------|-------------|
| `position` | `[x, y, z]` | World-space coordinates |

#### getViewportState()

**`StreamBIM.API.getViewportState(): Promise<any>`**

Returns the full viewport state (camera + extra viewer state) as a serializable JSON object. More comprehensive than `getCameraState` -- includes layers, search state, etc.

#### setViewportState(state)

**`StreamBIM.API.setViewportState(state: any): Promise<boolean>`**

Restores a full viewport state previously obtained from `getViewportState()`.

#### applyViewpoint(viewpoint)

**`StreamBIM.API.applyViewpoint(viewpoint: any): Promise<boolean>`**

Applies a saved viewpoint (semantic shortcut for setting camera, layers, etc.).

---

### Navigation

#### gotoObject(guid)

**`StreamBIM.API.gotoObject(guid: string): Promise<boolean>`**

Navigates the camera to frame/focus on an object.

#### gotoSpace(guid)

**`StreamBIM.API.gotoSpace(guid: string): Promise<boolean>`**

Navigates the camera into a space by its IFC GUID.

#### gotoFloor(floorId)

**`StreamBIM.API.gotoFloor(floorId: string | number): Promise<boolean>`**

Jumps the camera to a specific floor.

#### goHome()

**`StreamBIM.API.goHome(): Promise<boolean>`**

Returns to the home/start view (if configured for the project).

---

### Object Visibility & Highlighting

#### highlightObject(guid)

**`StreamBIM.API.highlightObject(guid: string): Promise<boolean>`**

Highlights (selects) an object in the 3D scene.

#### deHighlightObject(guid)

**`StreamBIM.API.deHighlightObject(guid: string): Promise<boolean>`**

Removes the highlight from a single object.

#### deHighlightAllObjects()

**`StreamBIM.API.deHighlightAllObjects(): Promise<boolean>`**

Clears all object highlights.

#### hideObject(guid)

**`StreamBIM.API.hideObject(guid: string): Promise<boolean>`**

Hides a single object by GUID.

#### showObject(guid)

**`StreamBIM.API.showObject(guid: string): Promise<boolean>`**

Shows a previously hidden object.

#### showAllObjects()

**`StreamBIM.API.showAllObjects(): Promise<boolean>`**

Resets the hidden state for all objects.

#### highlightSystem(guid)

**`StreamBIM.API.highlightSystem(guid: string): Promise<boolean>`**

Highlights all objects belonging to an IFC system by the system's GUID.

> **Status:** Beta -- available via `taskctrl` flavor. See [Beta Methods](#beta-methods).

---

### Object & Space Info

#### getObjectInfo(guid)

**`StreamBIM.API.getObjectInfo(guid: string): Promise<ObjectInfo>`**

Returns full IFC object information and properties.

**Response shape:**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | string | Object GUID |
| `name` | string | Object name |
| `center` | `[x, y, z]` | Object center point |
| `properties` | object | IFC property sets as key-value pairs |
| `building` | string | Building ID |

Commonly used properties accessible via `result.properties`:
- `Type Object Global Id` -- GUID of the IFC type object
- `System Global Id` -- GUID(s) of associated system(s) (comma-separated if multiple)
- `Space Global Id` -- GUID(s) of containing space(s)

#### getFloors()

**`StreamBIM.API.getFloors(): Promise<Array<{id: string|number, name: string, height: number}>>`**

Returns all floors in the model with their IDs, names, and heights.

#### getSpaces()

**`StreamBIM.API.getSpaces(): Promise<string[]>`**

Returns the GUID(s) of the space(s) where the camera is currently located.

#### valuesForObjectProperty(property)

**`StreamBIM.API.valuesForObjectProperty(property: string): Promise<any[]>`**

Returns distinct values for a property across the entire model.

| Parameter | Type | Description |
|-----------|------|-------------|
| `property` | string | Property key in `psetName~propKey` format |

---

### Search & Sets

#### findObjects(query)

**`StreamBIM.API.findObjects(query: {key: string, value: string, limit?: number}): Promise<string[]>`**

Finds GUIDs matching a property filter. Does **not** update the active selection in the viewer.

**Simple query example:**

```javascript
const guids = await StreamBIM.API.findObjects({
  key: 'System Global Id',
  value: '08CWGl08rCWBFXLXyoG6Rs',
  limit: 100
});
```

#### applyObjectSearch(query, replace?)

**`StreamBIM.API.applyObjectSearch(query: ObjectSearchQuery, replace?: boolean): Promise<string[]>`**

Applies a search as the active selection in the viewer (objects are visually highlighted). Optionally replaces the current set.

**Simple query:**

```javascript
await StreamBIM.API.applyObjectSearch({
  key: '@kind',
  value: 'Door'
}, true);
```

**Advanced query with IFC rules, paging, and sorting:**

```javascript
await StreamBIM.API.applyObjectSearch({
  filter: {
    rules: [[{
      buildingId: '1000',
      psetName: 'BaseQuantities',
      propKey: 'Height',
      propValue: '2000',
      operator: '>'
    }]]
  },
  page: { limit: 1000, skip: 0 },
  sort: { field: 'Name', descending: false }
});
```

**Search query shape:**

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Property key to match (e.g. `@kind`, `System Global Id`) |
| `value` | string | Value to match |
| `limit` | number | Max results |
| `filter.rules` | `Rule[][]` | Nested array of IFC search rules (OR of ANDs) |
| `page.limit` | number | Pagination limit |
| `page.skip` | number | Pagination offset |
| `sort.field` | string | Sort field name |
| `sort.descending` | boolean | Sort direction |

**IFC Rule fields:**

| Field | Type | Description |
|-------|------|-------------|
| `buildingId` | string | Building ID to search within |
| `psetName` | string | IFC property set name |
| `propKey` | string | Property key (use `@kind` for IFC type filtering) |
| `propValue` | string | Value to match |
| `operator` | string | Comparison operator: `=`, `>`, `<`, `>=`, `<=`, `startsWith`, etc. |

#### getObjectInfoForSearch(query)

**`StreamBIM.API.getObjectInfoForSearch(query: ObjectSearchQuery): Promise<ObjectInfo[]>`**

Runs a search and returns full object info for all matching objects.

```javascript
const doors = await StreamBIM.API.getObjectInfoForSearch({
  filter: { key: '@kind', value: 'Door' },
  page: { limit: 1000, skip: 0 },
  sort: { field: 'Name', descending: false }
});
```

#### resetObjectSearch()

**`StreamBIM.API.resetObjectSearch(): Promise<boolean>`**

Clears the active search/selection.

#### setSearchVisualizationMode(mode)

**`StreamBIM.API.setSearchVisualizationMode(mode: string): Promise<boolean>`**

Controls how non-matching objects are displayed while a search is active.

| Mode | Description |
|------|-------------|
| `'HIDDEN'` | Non-matching objects are hidden |
| `'FADED'` | Non-matching objects are shown faded/transparent |
| `'ORIGINAL'` | Non-matching objects are shown normally |

#### zoomToSearchResult()

**`StreamBIM.API.zoomToSearchResult(): Promise<boolean>`**

Frames the camera to fit the current active search selection.

#### quickSearch(freetext)

**`StreamBIM.API.quickSearch(freetext: string): Promise<any>`**

Searches objects and properties by free text. Returns matches for UI display.

---

### Color Coding

#### colorCodeObjects(map)

**`StreamBIM.API.colorCodeObjects(map: Record<string, string>): Promise<boolean>`**

Applies color coding to objects by GUID. Pass an empty object to clear.

| Parameter | Type | Description |
|-----------|------|-------------|
| `map` | `Record<GUID, color>` | Object GUID to hex color string mapping |

```javascript
await StreamBIM.API.colorCodeObjects({
  '362dngm4r7CQ3PvZ2b5Y_N': 'red',
  '362dngm4r7CQ3PvZ2b5Y_8': 'white',
  '362dngm4r7CQ3PvZ2b5Y_9': 'blue'
});
// Clear:
await StreamBIM.API.colorCodeObjects({});
```

#### colorCodeObjectsWithLegends({data, legends})

**`StreamBIM.API.colorCodeObjectsWithLegends({data, legends}): Promise<boolean>`**

Color codes objects and displays a legend overlay.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Record<GUID, string>` | Object GUID to hex color |
| `legends` | `Record<string, string>` | Label to hex color for legend display |

> **Status:** Beta -- available via `taskctrl` flavor. See [Beta Methods](#beta-methods).

```javascript
await StreamBIM.API.colorCodeObjectsWithLegends({
  data: {
    '1uR2u13vnCeO9feOa0NW1P': '7d7d7d',
    '3tpWS5jfPEmf7g9kFUlExZ': '4abb32'
  },
  legends: {
    'Not started': '7d7d7d',
    'On track': '4abb32'
  }
});
```

#### colorCodeSpaces(map)

**`StreamBIM.API.colorCodeSpaces(map: Record<string, string>): Promise<boolean>`**

Applies color coding to IFC spaces by GUID. Pass an empty object to clear.

#### colorCodeSpacesWithLegends({data, legends})

**`StreamBIM.API.colorCodeSpacesWithLegends({data, legends}): Promise<boolean>`**

Color codes spaces and displays a legend overlay.

> **Status:** Beta -- available via `taskctrl` flavor. See [Beta Methods](#beta-methods).

```javascript
const data = {
  '01WdkzDc55oA5oPFwqUbmR': '7d7d7d',
  '028y6nXsvDv8AOsMQjaEZR': '4abb32',
  '029$nqXNzDP9018VbDWlS$': 'b90c0c'
};
const legends = {
  'Not started': '7d7d7d',
  'On track': '4abb32',
  'Over due': 'b90c0c'
};
await StreamBIM.API.colorCodeSpacesWithLegends({ data, legends });
```

#### colorCodeByProperty(opts)

**`StreamBIM.API.colorCodeByProperty(opts?: {pset?: string, propertyKey?: string}): Promise<boolean>`**

Auto color-codes the current search selection by property value (the viewer decides buckets/colors). Pass `null` to reset.

```javascript
await StreamBIM.API.applyObjectSearch({ key: '@kind', value: 'Door' });
await StreamBIM.API.colorCodeByProperty({
  pset: 'BaseQuantities',
  propertyKey: 'Height'
});

// Reset:
await StreamBIM.API.colorCodeByProperty(null);
```

---

### Layers & Grids

#### getLayers()

**`StreamBIM.API.getLayers(): Promise<Record<string, boolean>>`**

Returns the current layer visibility map (layer name to visible boolean).

#### setLayers(layers)

**`StreamBIM.API.setLayers(layers: Record<string, boolean>): Promise<boolean>`**

Applies a layer visibility map. Layers not included in the map are unchanged.

```javascript
const layers = await StreamBIM.API.getLayers();
// Hide specific layers
layers['REBAR_LAYER'] = false;
layers['LARCH_LAYER'] = false;
await StreamBIM.API.setLayers(layers);
```

#### showGrids()

**`StreamBIM.API.showGrids(): Promise<boolean>`**

Shows grid lines in the 3D scene.

#### hideGrids()

**`StreamBIM.API.hideGrids(): Promise<boolean>`**

Hides grid lines in the 3D scene.

---

### Screenshots & Maps

#### takeScreenshot()

**`StreamBIM.API.takeScreenshot(): Promise<string>`**

Returns a PNG data URL of the current 3D view.

```javascript
const dataUrl = await StreamBIM.API.takeScreenshot();
document.getElementById('img').src = dataUrl;
```

#### getMapImage(opts)

**`StreamBIM.API.getMapImage(opts: {width: number, height: number, resolution: number}): Promise<string>`**

Generates a map image (overview or detail). Returns a data URL.

| Parameter | Type | Description |
|-----------|------|-------------|
| `width` | number | Image width in pixels |
| `height` | number | Image height in pixels |
| `resolution` | number | Meters per pixel (5 = overview, 1 = detail) |

```javascript
// Overview map
const overview = await StreamBIM.API.getMapImage({ width: 1024, height: 768, resolution: 5 });
// Detail map
const detail = await StreamBIM.API.getMapImage({ width: 1024, height: 768, resolution: 1 });
```

#### getAnnotatedFloorplan(position)

**`StreamBIM.API.getAnnotatedFloorplan(position: [number, number, number]): Promise<string>`**

Generates a floorplan PDF with an annotation marker near a 3D position. Returns a data URL or blob URL.

| Parameter | Type | Description |
|-----------|------|-------------|
| `position` | `[x, y, z]` | World-space coordinate (from `pickedObject.point` or `cameraState.position`) |

```javascript
// From a pick event
const pdfUrl = await StreamBIM.API.getAnnotatedFloorplan(result.point);
const anchor = document.createElement('a');
anchor.href = pdfUrl;
anchor.download = 'Floorplan.pdf';
anchor.click();
```

---

### Annotations / Custom Objects

#### createObject(opts)

**`StreamBIM.API.createObject(opts: {center: [number, number, number], name: string}): Promise<string>`**

Creates a simple annotation object at a world coordinate. Returns the GUID of the created object.

| Parameter | Type | Description |
|-----------|------|-------------|
| `center` | `[x, y, z]` | World-space position |
| `name` | string | Display name for the annotation |

```javascript
const guid = await StreamBIM.API.createObject({
  center: [10.0, 5.0, 3.0],
  name: 'Inspection Point A'
});
```

---

### Styling & UI Controls

#### setStyles(css)

**`StreamBIM.API.setStyles(css: string): Promise<boolean>`**

Injects CSS into the embedded viewer to customize appearance (hide buttons, recolor UI, etc.).

```javascript
await StreamBIM.API.setStyles(`
  #moreBtn, .map-more-buttons, #mapFloorplanSelector { display: none; }
  .message-container { background-color: white; }
  .color-coding-label-container { color: black; }
`);
```

#### setSkyColor(color)

**`StreamBIM.API.setSkyColor(color: string): Promise<boolean>`**

Changes the 3D scene background color.

| Parameter | Type | Description |
|-----------|------|-------------|
| `color` | string | CSS color value: `'white'`, `'#000'`, `'rgb(10,20,30)'` |

#### setNavigationMode(mode)

**`StreamBIM.API.setNavigationMode(mode: 0 | 1): Promise<boolean>`**

| Mode | Description |
|------|-------------|
| `0` | Person mode (walk/WASD) |
| `1` | Spin mode (orbit/rotate) |

#### setExpanded(expanded)

**`StreamBIM.API.setExpanded(expanded: boolean): Promise<boolean>`**

Expands or collapses the embedded widget container (if supported by the host page).

#### setShowExpandButton(show)

**`StreamBIM.API.setShowExpandButton(show: boolean): Promise<boolean>`**

Shows or hides the expand/collapse button in the widget UI.

#### toggleShowAllFloors(show)

**`StreamBIM.API.toggleShowAllFloors(show: boolean): Promise<boolean>`**

Toggles the multi-floor grid view on or off.

---

### Low-Level API

#### makeApiRequest(opts)

**`StreamBIM.API.makeApiRequest(opts): Promise<string>`**

Performs an authenticated HTTP request from the viewer context. Returns the raw response body as a string (usually JSON -- call `JSON.parse()` on the result).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Relative URL path (e.g. `/pgw/project-{id}/api/v1/ifc-searches`) |
| `body` | any | undefined | Request body (will be JSON-serialized) |
| `method` | string | `'GET'` | HTTP method: `GET`, `POST`, `PUT`, `DELETE` |
| `accept` | string | auto | Accept header |
| `contentType` | string | auto | Content-Type header |

This is the escape hatch for accessing any StreamBIM endpoint not directly exposed by the Widget API. See [IFC Searches](ifc-searches.md) for the most common use case.

```javascript
const res = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-3464/api/v1/ifc-searches',
  body: {
    rules: [[{ buildingId: '1000', propKey: '@kind', propValue: 'Space' }]]
  },
  method: 'POST'
});
const { searchId } = JSON.parse(res);
```

---

## Beta Methods

These methods are currently in beta (as of December 2025, per [issue #26](https://github.com/streambim/streambim-widget-api/issues/26)). They are available when using the `taskctrl` webapp flavor and estimated for general availability ~mid Q1 2026.

### setViewLayout(layout)

**`StreamBIM.API.setViewLayout(layout: string): Promise<boolean>`**

Switches the viewer layout mode.

| Layout | Description |
|--------|-------------|
| `'ALL_FLOORS'` | Shows all floors in a grid view |
| `'SMALL_2D'` | Standard single-floor 2D view |

```javascript
await StreamBIM.API.setViewLayout('ALL_FLOORS');
await StreamBIM.API.zoomToSearchResult();
```

### clipToFloor(floorId)

**`StreamBIM.API.clipToFloor(floorId: string | number): Promise<boolean>`**

Clips the 3D model to show only a specific floor (section cut).

```javascript
const floors = await StreamBIM.API.getFloors();
const thirdFloor = floors.sort((a, b) => a.height - b.height)[3];
await StreamBIM.API.clipToFloor(thirdFloor.id);
```

### colorCodeSpacesWithLegends / colorCodeObjectsWithLegends

Documented above in [Color Coding](#color-coding). Both add a legend overlay to the viewer alongside color coding.

### highlightSystem(guid)

Documented above in [Object Visibility & Highlighting](#object-visibility--highlighting). Highlights all objects in an IFC system.

---

## Complete Examples

### Color-code spaces with legends and zoom to fit

```javascript
const data = {
  'SpaceGuidA': '7d7d7d',
  'SpaceGuidB': '4abb32',
  'SpaceGuidC': 'b90c0c'
};
const legends = {
  'Not started': '7d7d7d',
  'On track': '4abb32',
  'Over due': 'b90c0c'
};

await StreamBIM.API.resetObjectSearch();
await StreamBIM.API.colorCodeSpacesWithLegends({ data, legends });
await StreamBIM.API.zoomToSearchResult();
```

### Find and show all objects in the same system

```javascript
const selected = await StreamBIM.API.getObjectInfo(guid);
const systemGuid = selected.properties['System Global Id'].split(', ')[0];

await StreamBIM.API.applyObjectSearch({
  key: 'System Global Id',
  value: systemGuid,
  limit: 100
}, true);
await StreamBIM.API.setSearchVisualizationMode('FADED');
await StreamBIM.API.zoomToSearchResult();
```

### Show a nice floor overview with property-based color coding

```javascript
const floors = await StreamBIM.API.getFloors();
const targetFloor = floors.sort((a, b) => a.height - b.height)[3];

await StreamBIM.API.clipToFloor(targetFloor.id);
await StreamBIM.API.applyObjectSearch({ key: '@kind', value: 'Space' });
await StreamBIM.API.colorCodeByProperty({
  pset: 'BaseQuantities',
  propertyKey: 'NetFloorArea'
});
await StreamBIM.API.setSearchVisualizationMode('ORIGINAL');
await StreamBIM.API.zoomToSearchResult();
```

### Take a screenshot and generate map tiles

```javascript
const screenshot = await StreamBIM.API.takeScreenshot();
document.querySelector('#screenshot').src = screenshot;

const overview = await StreamBIM.API.getMapImage({ width: 1024, height: 768, resolution: 5 });
const detail = await StreamBIM.API.getMapImage({ width: 1024, height: 768, resolution: 1 });
```

### Use makeApiRequest for IFC searches and JSON export

```javascript
// 1) Create search
const res = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-XXXX/api/v1/ifc-searches',
  method: 'POST',
  body: { rules: [[{ buildingId: '1000', propKey: '@kind', propValue: 'Space' }]] }
});
const { searchId } = JSON.parse(res);

// 2) Export as JSON
const fieldNames = btoa('GUID|Name|Long Name|Description');
const json = await StreamBIM.API.makeApiRequest({
  url: `/pgw/project-XXXX/api/v1/ifc-searches/export/json?searchId=${searchId}&fieldUnion=true&fieldNames=${fieldNames}&page[limit]=1000&page[skip]=0`
});
const spaces = JSON.parse(json).data;
```

### Customize the viewer UI in beforeInit

```javascript
beforeInit: async function() {
  StreamBIM.API.setAuthToken('your-token');
  StreamBIM.API.setStyles(`
    #moreBtn, .map-more-buttons, #mapFloorplanSelector,
    #measure-toggle-container, .btn-custom-views-control { display: none; }
    .message-container { background-color: white; }
    .color-coding-label-container { color: black; }
  `);
  StreamBIM.API.setSkyColor('white');
  StreamBIM.API.setNavigationMode(1);
  StreamBIM.API.hideGrids();
}
```

---

## Migration from v2 to v3

### API method access

Methods moved from `StreamBIM.*` to `StreamBIM.API.*`:

```javascript
// v2
const projectId = await StreamBIM.getProjectId();
// v3
const projectId = await StreamBIM.API.getProjectId();
```

### Connection method renamed

`StreamBIM.connect(methods)` became `StreamBIM.connectToParent(window, methods)`:

```javascript
// v2
StreamBIM.connect(methods).then(function() { ... });
// v3
StreamBIM.connectToParent(window, methods).then(function() { ... });
```

### New: Window mode

v3 added `StreamBIM.connectToWindow(childWindow, url, methods)` for controlling StreamBIM in a separate browser window.

---

## Notes & Guarantees

- All methods return a `Promise`. On error, the promise rejects with `{ code: string, detail?: any }`.
- GUIDs are StreamBIM IFC GUIDs unless a method explicitly uses a floor ID.
- Colors accept HEX strings only (e.g. `'ff0000'`, `'red'`).
- The library uses [Penpal](https://github.com/nicbarker/penpal) v7 (`WindowMessenger`) for cross-frame communication.
- The npm package version should match **3.x** on GitHub `master`; v2 used `StreamBIM.connect()` and flat `StreamBIM.getProjectId()` — see [Migration from v2 to v3](#migration-from-v2-to-v3).
