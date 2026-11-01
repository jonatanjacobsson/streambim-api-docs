# setLayers

**Status:** ✅ works · **Category:** Layers & grids · [All methods](../README.md)

Show or hide layers.

```ts
StreamBIM.API.setLayers(layers: Record<string, boolean>): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `layers` | `object` | yes | Layer name → visible. Names come from `getLayers()`. |

## Returns

`true`

## What StreamBIM does

`viewerController.setLayersVisibility(layers)`. No validation.

## Examples

#### Show only one layer, then restore

```js
const layers = await StreamBIM.API.getLayers();
const [keep] = Object.keys(layers).filter((n) => n !== 'grids');
await StreamBIM.API.setLayers(Object.fromEntries(Object.keys(layers).map((n) => [n, n === keep])));
const during = await StreamBIM.API.getLayers();
await StreamBIM.API.setLayers(layers);
return { keep, during };
```

<details open><summary>Output (verified 2026-11-01, 15 ms)</summary>

```json
{
  "keep": "orexoventtest",
  "during": {
    "orexoventtest": true,
    "UNDERTAK_REVIT_2025": false,
    "grids": false,
    "GRNSAKSSTIGEN24": false
  }
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[{"orexoventtest":true,"UNDERTAK_REVIT_2025":true,"grids":true,"GRNSAKSSTIGEN24"` | resolved `boolean` | 11 |
