# takeScreenshot

**Status:** ✅ works · **Category:** Screenshots, maps & floorplans · [All methods](../README.md)

PNG of the current 3D view.

```ts
StreamBIM.API.takeScreenshot(): Promise<string>
```

## Returns

`string`: `data:image/png;base64,…` at the viewer's canvas size (about 1 MB for a full-HD view).

## What StreamBIM does

`viewerController.createPreviewImage(true)`.

## Errors

- `{ code: "unknown" }` if no image could be produced.

## Examples

#### Screenshot into an <img>

```js
const url = await StreamBIM.API.takeScreenshot();
const img = new Image();
img.src = url;
await img.decode();
return { width: img.naturalWidth, height: img.naturalHeight, bytes: Math.round(url.length * 0.75) };
```

<details open><summary>Output (verified 2026-11-01, 40 ms)</summary>

```json
{
  "width": 1278,
  "height": 1304,
  "bytes": 393269
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `string` | 78 |
