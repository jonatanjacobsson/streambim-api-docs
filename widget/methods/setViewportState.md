# setViewportState

**Status:** ✅ works · **Category:** Camera & viewport · [All methods](../README.md)

Restore camera, hidden/highlighted objects, highlighted layers and clipping planes in one call.

```ts
StreamBIM.API.setViewportState(state: Partial<ViewportState> & { highlightedLayer?: string }): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `state.cameraState` | `object` | no | Same shape and validation as `setCameraState`. |
| `state.hiddenObjects` | `string[]` | no | Replaces the hidden set. Every entry must be a 22-char GUID. |
| `state.highlightedObjects` | `string[]` | no | Clears the selection, then selects these GUIDs. |
| `state.highlightedLayers` | `string[]` | no | Layer names to highlight. |
| `state.highlightedLayer` | `string` | no | Single-layer shorthand (undocumented). |
| `state.clippingPlanes` | `any` | no | As returned by `getViewportState`. |

## Returns

`true`: Resolves at once; the 3D sync happens on the next run loop.

## What StreamBIM does

Each key is applied only if present, so partial states are fine. `hiddenLayers` is returned by `getViewportState` but **ignored** here: use `setLayers`.

## Errors

- `{ code: "invalid", debug: "guid must be a valid 22 characters GUID string" }` for a bad GUID in `hiddenObjects` / `highlightedObjects`.
- Camera validation errors as for `setCameraState`.

## Examples

#### Restore a saved viewport

```js
const saved = await StreamBIM.API.getViewportState();
// ... user navigates, hides things ...
return await StreamBIM.API.setViewportState(saved);
```

<details open><summary>Output (verified 2026-11-01, 10 ms)</summary>

```json
true
```

</details>

#### Hide one object via viewport state

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
const saved = await StreamBIM.API.getViewportState();
await StreamBIM.API.setViewportState({ hiddenObjects: [...saved.hiddenObjects, door] });
const hidden = (await StreamBIM.API.getViewportState()).hiddenObjects.includes(door);
await StreamBIM.API.setViewportState({ hiddenObjects: saved.hiddenObjects });
return { hidden };
```

<details open><summary>Output (verified 2026-11-01, 113 ms)</summary>

```json
{
  "hidden": false
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[{"cameraState":{"position":[-29.051828043835457,-11.831257739228485,7.124982544` | resolved `boolean` | 2 |
| invalid GUID in hiddenObjects | `[{"hiddenObjects":["short"]}]` | rejected `{"code":"invalid","debug":"guid must be a valid 22 characters GUID string"}` | 2 |
