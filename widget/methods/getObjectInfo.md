# getObjectInfo

**Status:** ✅ works · **Category:** Object & model info · [All methods](../README.md)

All IFC properties of one object.

```ts
StreamBIM.API.getObjectInfo(guid: string): Promise<ObjectInfo>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `guid` | `string` | yes | 22-char GUID. |

## Returns

`object`: Plain JSON copy of the viewer's object record: `layer`, `properties` (flat map: `"@kind"`, `"Name"`, `"Global Id"`, `"Type Object Global Id"`, `"@Building Storey": { "@iid", "Name" }`, `"@Group Layer"`, and every pset value keyed `"PsetName~Prop"`-style or by display name), plus geometry/bookkeeping fields. Print `Object.keys(info)` on your model to see them all.

## What StreamBIM does

`storeservice.fetchObjectInfo(guid, "ifcObject")`, returned via `JSON.parse(JSON.stringify(record))`.

## Errors

- `{ code: "invalid", debug: "guid must be a valid 22 characters GUID string" }`
- `{ code: "notFound", debug: "Requested resource cannot be found: object not found ..." }` for a GUID not in the model.

## Examples

#### Read a door's properties

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
const info = await StreamBIM.API.getObjectInfo(door);
return { topLevelKeys: Object.keys(info), properties: info.properties };
```

<details open><summary>Output (verified 2026-11-01, 94 ms)</summary>

```json
{
  "topLevelKeys": [
    "layer",
    "properties",
    "groups",
    "center",
    "bbox",
    "boundary",
    "jobcreated",
    "jobdeleted",
    "classes",
    "floors",
    "spaces",
    "document",
    "building",
    "duplicates"
  ],
  "properties": {
    "@kind": "Door",
    "Name": "Single Door:D8:2649638",
    "Long Name": "2649638",
    "Description": "",
    "uri": "",
    "Global Id": "048mvnhWPDHefuPHQ5uMBr",
    "Type Object Global Id": "T~2Y5Yp$IeJununxjdY37DoD",
    "@Building Storey": {
      "@iid": "1004",
      "Name": "PLAN 1"
    },
    "@Group Layer": "GRNSAKSSTIGEN24",
    "@Document Id": 1000,
    "@Building Id": 0,
    "Timestamp": "2025-08-18 08:00:48 +0000 UTC",
    "groups": null,
    "BaseType": "ifcelement"
  }
}
```

</details>

#### Unknown GUID

```js
try {
  await StreamBIM.API.getObjectInfo('0000000000000000000000');
} catch (err) {
  return err;
}
```

<details open><summary>Output (verified 2026-11-01, 71 ms)</summary>

```json
{
  "code": "notFound",
  "debug": "Requested resource cannot be found: object not found: get object: get object: no such object exists: no rows in result set"
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["048mvnhWPDHefuPHQ5uMBr"]` | resolved `object` | 1 |
| invalid GUID | `["not-a-guid"]` | rejected `{"code":"invalid","debug":"guid must be a valid 22 characters GUID string"}` | 0 |
| well-formed but unknown GUID | `["0000000000000000000000"]` | rejected `{"code":"notFound","debug":"Requested resource cannot be found: object not found: get object: get object: no such object` | 114 |
