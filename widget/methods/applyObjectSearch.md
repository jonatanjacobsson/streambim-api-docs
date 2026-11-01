# applyObjectSearch

**Status:** ✅ works · **Category:** Search · [All methods](../README.md)

Run a search and show it in the viewer (matches highlighted, the rest per search visualization mode).

```ts
StreamBIM.API.applyObjectSearch(query: { key, value } | { rules }): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `query` | `object` | yes | Same as `findObjects` (no `limit`). The second `replace` argument in the old docs does not exist. |

## Returns

`true`: Resolves `true`, not a GUID list as the old docs say. Call `findObjects` with the same query if you need the GUIDs.

## What StreamBIM does

`viewerController.highlightIFCSearch.perform({ rules })`. Matches are drawn in the search highlight colour, which overrides `colorCodeObjects` colours on those objects.

## Errors

- A failing search leaves the promise pending (no catch in the host).

## Examples

#### Show all doors, fade the rest, then reset

```js
await StreamBIM.API.applyObjectSearch({ key: '@kind', value: 'Door' });
await StreamBIM.API.setSearchVisualizationMode('FADED');
await StreamBIM.API.zoomToSearchResult();
const shot = await StreamBIM.API.takeScreenshot();
await StreamBIM.API.resetObjectSearch();
return shot;
```

<details open><summary>Output (verified 2026-11-01, 204 ms)</summary>

```json
"[image #1 returned as image content]"
```

![Show all doors, fade the rest, then reset](../images/applyObjectSearch-1.jpeg)

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[{"key":"@kind","value":"Door"}]` | resolved `boolean` | 87 |
