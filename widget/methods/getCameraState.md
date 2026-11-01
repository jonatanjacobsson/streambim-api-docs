# getCameraState

**Status:** ✅ works · **Category:** Camera & viewport · [All methods](../README.md)

Current 3D camera: position and orientation.

```ts
StreamBIM.API.getCameraState(): Promise<{ position: [x, y, z], quaternion: [x, y, z, w] }>
```

## Returns

`object`: `position` is a world-space point in metres (z up). `quaternion` is the camera rotation. Pass the object back to `setCameraState` to restore the view.

## What StreamBIM does

Returns `viewerController.cameraState` as is.

## Errors

- Rejects `{ code: "invalid" }` if the viewer has no camera yet.

## Examples

#### Save the current view

```js
const cam = await StreamBIM.API.getCameraState();
return cam;
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
{
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
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `object` | 0 |
