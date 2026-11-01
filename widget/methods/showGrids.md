# showGrids

**Status:** ✅ works · **Category:** Layers & grids · [All methods](../README.md)

Show IFC grid lines.

```ts
StreamBIM.API.showGrids(): Promise<true>
```

## Returns

`true`

## What StreamBIM does

`viewerController.showGrids(true)`.

## Examples

#### Show grids

```js
return await StreamBIM.API.showGrids();
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
| normal call | `[]` | resolved `boolean` | 58 |
