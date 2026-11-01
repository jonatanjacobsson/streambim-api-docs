# gotoFloor

**Status:** ✅ works · **Category:** Navigation · [All methods](../README.md)

Switch the viewer to a floor (storey).

```ts
StreamBIM.API.gotoFloor(floorId: string): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `floorId` | `string` | yes | An `id` from `getFloors()`. |

## Returns

`true`: Always resolves `true`, also for unknown ids.

## What StreamBIM does

`store.peekRecord("floor", id)` then `viewerController.send("gotoFloor", floor)`. No validation.

## Errors

- None. An unknown id is silently ignored.

## Examples

#### Go to the lowest floor

```js
const floors = await StreamBIM.API.getFloors();
const lowest = floors.reduce((a, b) => (a.height <= b.height ? a : b));
await StreamBIM.API.gotoFloor(lowest.id);
return lowest;
```

<details open><summary>Output (verified 2026-11-01, 3 ms)</summary>

```json
{
  "name": "PLAN 1",
  "height": 0,
  "id": "1004"
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["1004"]` | resolved `boolean` | 3 |
