# getMapImage

**Status:** ⚠️ works, promise never resolves · **Category:** Screenshots, maps & floorplans · [All methods](../README.md)

Render the 2D map (OpenLayers) at a given size and resolution.

```ts
StreamBIM.API.getMapImage(opts?: { width?: number, height?: number, resolution?: number }): Promise<string>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `opts.width` | `number` | no | Pixels, default 600. |
| `opts.height` | `number` | no | Pixels, default 400. |
| `opts.resolution` | `number` | no | Metres per pixel, default 1. |

## Returns

`string`: PNG data URL. In testing with the default 3D layout the promise **never settled**: the host waits for the map's `rendercomplete` event, which does not fire while the 2D map is not rendered. Expect it to work only when the map view is visible.

## What StreamBIM does

Resizes `.map`, sets the OpenLayers view resolution, waits for `rendercomplete`, composites the layer canvases onto white, restores size and resolution.

## Errors

- Errors from the map are rejected as-is.

## Examples

#### Guard with a timeout

```js
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('getMapImage timed out')), ms));
try {
  return await Promise.race([StreamBIM.API.getMapImage({ width: 400, height: 300, resolution: 0.5 }), timeout(5000)]);
} catch (err) {
  return err.message;
}
```

<details open><summary>Output (verified 2026-11-01, 5005 ms)</summary>

```json
"getMapImage timed out"
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[{"width":300,"height":200,"resolution":0.5}]` | **never settled** | 6010 |
