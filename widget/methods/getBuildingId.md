# getBuildingId

**Status:** ✅ works · **Category:** Project & user · [All methods](../README.md)

Id of the building (model) open in the viewer, as a string.

```ts
StreamBIM.API.getBuildingId(): Promise<string>
```

## Returns

`string`: Building id, e.g. `"1000"`. Needed as `buildingId` in search rules and REST ifc-searches.

## What StreamBIM does

Reads `projectservice.building.id`.

## Errors

- Rejects `{ code: "unknown" }` if no building is loaded.

## Examples

#### Read the building id

```js
return await StreamBIM.API.getBuildingId();
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
"1000"
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `string` | 0 |
