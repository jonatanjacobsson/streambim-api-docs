# getFloors

**Status:** ✅ works · **Category:** Object & model info · [All methods](../README.md)

Floors (storeys) shown in the viewer.

```ts
StreamBIM.API.getFloors(): Promise<Array<{ id: string, name: string, height: number }>>
```

## Returns

`array`: Only floors with `shown` set. `height` is the elevation in metres. Not sorted: sort by `height` yourself. Ids are strings.

## What StreamBIM does

`viewerController.model.floors.filterBy("shown")` mapped to `{ name, height, id }`.

## Examples

#### Floors sorted by elevation

```js
const floors = await StreamBIM.API.getFloors();
return floors.sort((a, b) => a.height - b.height);
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
[
  {
    "name": "PLAN 1",
    "height": 0,
    "id": "1004"
  },
  {
    "name": "Plan 2",
    "height": 2.55,
    "id": "1000"
  },
  {
    "name": "PLAN 2",
    "height": 3,
    "id": "1007"
  },
  {
    "name": "PLAN 3",
    "height": 6,
    "id": "1012"
  },
  {
    "name": "PLAN 4",
    "height": 9,
    "id": "1010"
  },
  {
    "name": "PLAN 5",
    "height": 12,
    "id": "1013"
  },
  {
    "name": "MARKNIVÅ",
    "height": 14,
    "id": "1011"
  },
  {
    "name": "VÅNING 10 - BY 16",
    "height": 15.76,
    "id": "1014"
  },
  {
    "name": "ACH",
    "height": 17.91,
    "id": "1018"
  },
  {
    "name": "VÅNING 10 - BY 5, 7, 8",
    "height": 18.61,
    "id": "1015"
  },
  {
    "name": "VÅNING 10 - BY 4",
    "height": 18.82,
    "id": "1019"
  },
  {
    "name": "VÅNING 10 - BY 3",
    "height": 19.25,
    "id": "1008"
… (27 more lines)
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `array` | 0 |
