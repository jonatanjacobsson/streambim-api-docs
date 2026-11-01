# Widget events (callbacks)

[Widget API docs](README.md)

StreamBIM calls these functions on your widget. Pass them in the `methods` object when you connect. StreamBIM only calls names you provided (`hasHandlerFor`). Calls made while the widget is closed are queued and delivered when it reconnects (`pendingActions`).

| Event | Payload | When |
|---|---|---|
| `pickedObject` | `{ guid: string, point?: [x, y, z], shiftKey?: boolean }` | The user clicks an object in 3D (with `point`) or picks one from a list / object reference (without `point`). `shiftKey` is set when shift was held (undocumented). |
| `cameraChanged` | `{ position: [x, y, z], quaternion: [x, y, z, w] }` | Every camera update. Fires many times a second while navigating: throttle it. |
| `floorChanged` | `string (floor id)` | The active floor changes. |
| `spacesChanged` | `string[] (space GUIDs)` | The camera enters or leaves a space. `[]` means outside all spaces. |
| `didExpand` | `none` | The widget panel was expanded. |
| `didContract` | `none` | The widget panel was collapsed. |
| `modelReady` | `none` | Undocumented. After `setAuthToken` succeeds, or after a reload following widget authentication in embedded mode. |
| `beforeInit` | `none` | Embedded mode only (`connectToChild`), right after the connection is made. Not called for widgets in the StreamBIM side panel. |

## Observed payloads

### pickedObject

```json
{
  "point": [
    -20.282288840245577,
    -5.559010739385439,
    0.8919407255169105
  ],
  "guid": "02r5CzxXH7zAF7t82eHOHi",
  "shiftKey": false
}
```

## Example

From the harness widget (`widget/widget.js`), which forwards every event to MCP clients:

```js
const callbacks = {
  pickedObject: (r) => console.log('picked', r.guid, r.point, r.shiftKey),
  spacesChanged: (guids) => console.log(guids.length ? 'in space ' + guids[0] : 'outside spaces'),
  floorChanged: (floorId) => console.log('floor', floorId),
  cameraChanged: throttle((cam) => save(cam), 500), // fires continuously while moving
  didExpand: () => document.body.classList.add('expanded'),
  didContract: () => document.body.classList.remove('expanded'),
  modelReady: () => console.log('model ready'),
};
```
