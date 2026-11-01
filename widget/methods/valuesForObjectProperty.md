# valuesForObjectProperty

**Status:** ✅ works · **Category:** Object & model info · [All methods](../README.md)

Distinct values of a property across the building, with object counts.

```ts
StreamBIM.API.valuesForObjectProperty(property: string): Promise<Record<string, number>>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `property` | `string` | yes | `"propKey"` or `"PsetName~propKey"`, e.g. `"@kind"`, `"Name"`, `"Pset_DoorCommon~FireRating"`. |

## Returns

`object`: Map from value to number of objects, e.g. `{ "Door": 20, "Wall": 312 }`. (The old docs say `any[]`; it is an object.)

## What StreamBIM does

POSTs an `ifc-searches` rule `{ operator: "hasValue", propKey, psetName? }`, then `GET /octtree/colorcode?searchId…` and returns its `count`.

## Errors

- Empty string rejects with the plain string `"No property"`.
- Backend errors as `{ code, debug }`.

## Examples

#### Count objects per IFC class

```js
const counts = await StreamBIM.API.valuesForObjectProperty('@kind');
return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
```

<details open><summary>Output (verified 2026-11-01, 145 ms)</summary>

```json
[
  [
    "Covering",
    3711
  ],
  [
    "Duct segment",
    3486
  ],
  [
    "Duct fitting",
    2496
  ],
  [
    "Air terminal",
    471
  ],
  [
    "Damper",
    456
  ],
  [
    "Duct silencer",
    208
  ],
  [
    "Wall",
    82
  ],
  [
    "Building element proxy",
    81
  ],
  [
    "Furniture",
    72
  ],
  [
    "Opening element",
    64
  ]
]
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["Name"]` | resolved `object` | 136 |
| normal call | `["@kind"]` | resolved `object` | 109 |
