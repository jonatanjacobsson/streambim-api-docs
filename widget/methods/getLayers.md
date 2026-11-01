# getLayers

**Status:** ✅ works · **Category:** Layers & grids · [All methods](../README.md)

Model layers (uploaded IFC files / group layers) and whether each is visible.

```ts
StreamBIM.API.getLayers(): Promise<Record<string, boolean>>
```

## Returns

`object`: Layer name → visible. Includes a `grids` entry.

## What StreamBIM does

`viewerController.getLayersVisibility()`.

## Examples

#### List layers

```js
return await StreamBIM.API.getLayers();
```

<details open><summary>Output (verified 2026-11-01, 4 ms)</summary>

```json
{
  "orexoventtest": true,
  "UNDERTAK_REVIT_2025": true,
  "grids": true,
  "GRNSAKSSTIGEN24": true
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `object` | 0 |
