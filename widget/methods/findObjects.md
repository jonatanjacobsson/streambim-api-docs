# findObjects

**Status:** ✅ works · **Category:** Search · [All methods](../README.md)

Search the model and get matching GUIDs, without changing the view.

```ts
StreamBIM.API.findObjects(query: { key: string, value: string, limit?: number } | { rules: Rule[][], limit?: number }): Promise<string[]>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `query.key / query.value` | `string` | no | Single exact-match rule on the current building, e.g. `{ key: "@kind", value: "Door" }`. |
| `query.rules` | `Rule[][]` | no | Full rule set (overrides key/value). Outer array = OR, inner = AND. Rule: `{ buildingId, propKey, propValue, psetName?, operator? }` with operators `=`, `>`, `<`, `>=`, `<=`, `startsWith`, `hasValue`. You must give `buildingId` yourself here. |
| `query.limit` | `number` | no | Max GUIDs returned. |

## Returns

`string[]`: GUIDs.

## What StreamBIM does

Builds `{ rules }` (key/value become one rule with the current building) and runs `viewerController.searchForIfcObjects`.

## Errors

- Backend errors as `{ code, debug }`.
- Occasionally rejects `{ code: "unknown", debug: null }` for a valid query (3 times in ~100 calls during verification; the same query succeeded on retry). Retry once before treating it as a real failure.

## Examples

#### Simple key/value

```js
return await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 5 });
```

<details open><summary>Output (verified 2026-11-01, 84 ms)</summary>

```json
[
  "048mvnhWPDHefuPHQ5uMBr",
  "0FdTIYaE1DKvQpJiepvzCz",
  "0FdTIYaE1DKvQpJiepvzLh",
  "0FdTIYaE1DKvQpJiepvzOr",
  "0FdTIYaE1DKvQpJiepvzQL"
]
```

</details>

#### Rules: windows OR doors

```js
const buildingId = await StreamBIM.API.getBuildingId();
const guids = await StreamBIM.API.findObjects({
  rules: [
    [{ buildingId, propKey: '@kind', propValue: 'Window' }],
    [{ buildingId, propKey: '@kind', propValue: 'Door' }],
  ],
  limit: 1000,
});
return guids.length;
```

<details open><summary>Output (verified 2026-11-01, 92 ms)</summary>

```json
51
```

</details>

#### Rules: name prefix

```js
const buildingId = await StreamBIM.API.getBuildingId();
return await StreamBIM.API.findObjects({
  rules: [[{ buildingId, propKey: 'Name', propValue: 'Single Door', operator: 'startsWith' }]],
  limit: 3,
});
```

<details open><summary>Output (verified 2026-11-01, 110 ms)</summary>

```json
[
  "048mvnhWPDHefuPHQ5uMBr",
  "0BjZrEb7Bkr0EdHYywx_Mf",
  "0FdTIYaE1DKvQpJiepvzCz"
]
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[{"key":"@kind","value":"Door","limit":3}]` | resolved `array` | 78 |
| rules form | `[{"rules":[[{"buildingId":"1000","propKey":"@kind","propValue":"Window"}]],"limi` | resolved `array` | 84 |
