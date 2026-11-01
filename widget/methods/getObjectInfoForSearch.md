# getObjectInfoForSearch

**Status:** ✅ works · **Category:** Search · [All methods](../README.md)

Run a search and get a property table for the matches (the "export to JSON" data).

```ts
StreamBIM.API.getObjectInfoForSearch(query: { filter, page?, sort?, fieldUnion? }): Promise<SearchExport>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `query.filter` | `{ key, value } \| { rules }` | yes | Same as `findObjects`. |
| `query.page` | `{ limit?, skip? }` | no | `limit` defaults to 1000, capped at 10000. `skip` defaults to 0. |
| `query.sort` | `{ field, descending? }` | no | Column name to sort on, e.g. `"Name"` (the host base64-encodes it). |
| `query.fieldUnion` | `boolean` | no | Include the union of all property columns across matches. Default `false`. |

## Returns

`object`: `{ header: [{ id, name, datatype }], data: [...rows] }` as returned by `/ifc-searches/export/json`. Rows are keyed by header `id`.

## What StreamBIM does

Runs `searchForIfcObjects`, then `GET /ifc-searches/export/json?searchId=…&fieldUnion=…&page[limit]=…&page[skip]=…&sortField=…&sortDescending=…&queue=widgetAPI`.

## Errors

- No `filter`: rejects `{ status: 400, detail: "No filter provided" }` (different shape from other errors).
- Backend errors as `{ code, debug }`.

## Examples

#### First 3 doors sorted by name

```js
const res = await StreamBIM.API.getObjectInfoForSearch({
  filter: { key: '@kind', value: 'Door' },
  page: { limit: 3, skip: 0 },
  sort: { field: 'Name', descending: false },
});
return { columns: res.header.map((h) => h.id), rows: res.data };
```

<details open><summary>Output (verified 2026-11-01, 144 ms)</summary>

```json
{
  "columns": [
    "GUID",
    "Name",
    "Long Name",
    "Description",
    "IFC Type",
    "Type Name",
    "Link"
  ],
  "rows": [
    {
      "GUID": "2uYU4y7nP7g9mgpu4mkkNO",
      "Name": "Cased Opening:ÖK10:2731493",
      "Long Name": "2731493",
      "Description": null,
      "IFC Type": "Door",
      "Type Name": "Cased Opening:ÖK10",
      "Link": "https://app.streambim.com/webapp/default/#/viewer/objectinfo/ifc/object/2uYU4y7nP7g9mgpu4mkkNO?buildingId=1000&apply=true&goto=true&projectId=15974"
    },
    {
      "GUID": "1NE2FAfsz5kedhy_IXrbxf",
      "Name": "Doors_Door-Sets_Diplomat_Elvira-Glass-double-door:21Mx16M:2680668",
      "Long Name": "2680668",
      "Description": null,
      "IFC Type": "Door",
      "Type Name": "Doors_Door-Sets_Diplomat_Elvira-Glass-double-door:21Mx16M",
      "Link": "https://app.streambim.com/webapp/default/#/viewer/objectinfo/ifc/object/1NE2FAfsz5kedhy_IXrbxf?buildingId=1000&apply=true&goto=true&projectId=15974"
    },
    {
      "GUID": "2uYU4y7nP7g9mgpu4mkk8p",
      "Name": "Overhead Sectional Door:Takskjutport 5500x5500:2730510",
      "Long Name": "2730510",
      "Description": null,
      "IFC Type": "Door",
      "Type Name": "Overhead Sectional Door:Takskjutport 5500x5500",
      "Link": "https://app.streambim.com/webapp/default/#/viewer/objectinfo/ifc/object/2uYU4y7nP7g9mgpu4mkk8p?buildingId=1000&apply=true&goto=true&projectId=15974"
    }
  ]
}
```

</details>

#### Missing filter

```js
try {
  await StreamBIM.API.getObjectInfoForSearch({ page: { limit: 1 } });
} catch (err) {
  return err;
}
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
{
  "status": 400,
  "detail": "No filter provided"
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[{"filter":{"key":"@kind","value":"Door"},"page":{"limit":2,"skip":0},"sort":{"f` | resolved `object` | 169 |
| no filter | `[{"page":{"limit":2}}]` | rejected `{"status":400,"detail":"No filter provided"}` | 0 |
