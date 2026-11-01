# hideGrids

**Status:** ✅ works · **Category:** Layers & grids · [All methods](../README.md)

Hide IFC grid lines.

```ts
StreamBIM.API.hideGrids(): Promise<true>
```

## Returns

`true`

## What StreamBIM does

`viewerController.showGrids(false)`.

## Examples

#### Hide grids

```js
return await StreamBIM.API.hideGrids();
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
true
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `boolean` | 12 |
