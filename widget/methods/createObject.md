# createObject

**Status:** ✍️ writes data · **Category:** Annotations · [All methods](../README.md)

Create a persistent annotation object in the building.

```ts
StreamBIM.API.createObject(opts: { center: [x, y, z], name: string }): Promise<string>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `opts.center` | `[number, number, number]` | yes | Viewer point, the same axes as `pickedObject.point` and `getCameraState().position`. Pass a picked point as is. |
| `opts.name` | `string` | yes | Stored as the `Name` property. |

## Returns

`string`: Id of the new object.

## What StreamBIM does

`store.createRecord("ifcObject", { center: [x, z, -y], properties: { Name, "@kind": "Annotation" } })` on the current building, then `save()` (`POST /v2/ifc-objects`). The swap converts viewer axes to building coordinates: viewer points are building `[x, y, z]` written as `[x, -z, y]` (a clicked door at building `[-9.96, 7.92, 3.15]` was picked as `[-9.96, -3.15, 7.92]`). So the annotation lands exactly at a picked point. The object is saved to the project for everyone, and **can't be deleted**: `DELETE /v2/ifc-objects/{id}` answers 200 but the annotation stays. Rename it, give it property sets or attachments over REST: see the [custom objects guide](../guides/annotations-custom-objects.md).

## Errors

- Save errors are rejected as-is (Ember Data error object).

## Note

Not run by default because it writes to the project. `npm run verify -- --include-writes` (in `harness/`) runs it.

## Examples

#### Drop an annotation at the camera

```js
const { position } = await StreamBIM.API.getCameraState();
const id = await StreamBIM.API.createObject({ center: position, name: 'Widget test annotation' });
return id;
```

<details open><summary>Output (verified 2026-11-01, 95 ms)</summary>

```json
"0cNP0TnuH3tRVcgHb$44hd"
```

</details>
