# quickSearch

**Status:** ✅ works · **Category:** Search · [All methods](../README.md)

Free-text search across IFC classes, properties, systems and type objects (the search box suggestions).

```ts
StreamBIM.API.quickSearch(freetext: string): Promise<QuickSearchResult>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `freetext` | `string` | yes | Non-empty search text. |

## Returns

`object`: `{ kind: [{ name }], property: [{ name: "Pset~Prop~datatype", measure, unit, datatype, basetype }], system, object, typeObject }`. Up to 100 per group.

## What StreamBIM does

POST `/query-builder/freetext` with `{ freetext, buildingId, limit: { kind: -1, object: 100, property: 100, system: 100, typeObject: 100 } }`.

## Errors

- Empty text rejects with the plain string `"No freetext"`.

## Examples

#### What matches "door"?

```js
const r = await StreamBIM.API.quickSearch('Door');
return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, 3) : v]));
```

<details open><summary>Output (verified 2026-11-01, 47 ms)</summary>

```json
{
  "system": null,
  "kind": [
    {
      "name": "Door"
    }
  ],
  "property": [
    {
      "name": "Pset_DoorCommon~IsExternal~bool",
      "measure": "boolean",
      "unit": "",
      "datatype": "bool",
      "basetype": "ifcelement"
    },
    {
      "name": "Pset_DoorCommon~Reference~str",
      "measure": "identifier",
      "unit": "",
      "datatype": "str",
      "basetype": "ifcelement"
    }
  ],
  "typeObject": [
    {
      "id": "1aeHga2kz2YnnljLiX9Z$X",
      "name": "Doors_Door-Sets_Diplomat_Elvira-Glass-double-door:21Mx16M"
    },
    {
      "id": "36$3X5RjRF6Yo4cWkcGlG6",
      "name": "Overhead Sectional Door:Takskjutport 5500x5500"
    },
    {
      "id": "3oWJ9_zlbhn5A681Nr11Dj",
      "name": "Single Door:D8"
    }
  ],
  "object": [
    {
      "id": "1NE2FAfsz5kedhy_IXrbxf",
      "name": "Doors_Door-Sets_Diplomat_Elvira-Glass-double-door:21Mx16M:2680668",
      "kind": "Door",
      "longName": "2680668",
      "description": ""
    },
    {
      "id": "3UC4bnAgC$mR8FDPZwV2H4",
      "name": "Doors_Door-Sets_Diplomat_Elvira-Glass-double-door:21Mx16M:2680668:1",
      "kind": "Opening element",
      "longName": "2680668",
      "description": ""
    },
    {
      "id": "2uYU4y7nP7g9mgpu4mkk8p",
      "name": "Overhead Sectional Door:Takskjutport 5500x5500:2730510",
      "kind": "Door",
      "longName": "2730510",
      "description": ""
    }
  ],
… (10 more lines)
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["Door"]` | resolved `object` | 54 |
| empty text | `[""]` | rejected `"No freetext"` | 0 |
