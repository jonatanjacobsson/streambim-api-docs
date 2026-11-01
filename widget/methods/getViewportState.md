# getViewportState

**Status:** ✅ works · **Category:** Camera & viewport · [All methods](../README.md)

Snapshot of camera, hidden and highlighted objects, layer state and clipping planes.

```ts
StreamBIM.API.getViewportState(): Promise<ViewportState>
```

## Returns

`object`: `{ cameraState, hiddenObjects: string[], highlightedObjects: string[], hiddenLayers: string[], highlightedLayers: string[] | null, clippingPlanes }`. Feed it to `setViewportState` to restore everything.

## What StreamBIM does

Built from `viewerController.cameraState`, `hiddenObjects` (GUIDs), `selectionmanager.getSelectedObjects()`, `getHiddenLayers()`, `highlightedLayers`, `getClippingPlanes()`.

## Examples

#### Snapshot the viewport

```js
const vp = await StreamBIM.API.getViewportState();
return { ...vp, hiddenObjects: vp.hiddenObjects.length + ' GUIDs' };
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
{
  "cameraState": {
    "position": [
      -15.540310729342849,
      -0.8707097899909151,
      10.097361940201292
    ],
    "quaternion": [
      -0.6183583964900597,
      -0.0478399581899093,
      -0.7835296960076222,
      0.03775509720332987
    ]
  },
  "hiddenObjects": "0 GUIDs",
  "highlightedObjects": [
    "048mvnhWPDHefuPHQ5uMBr"
  ],
  "hiddenLayers": [],
  "highlightedLayers": null,
  "clippingPlanes": []
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `object` | 0 |
