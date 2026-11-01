# createObject

**Status:** ✍️ writes data · **Category:** Annotations · [All methods](../README.md)

Create a persistent annotation object in the building.

```ts
StreamBIM.API.createObject(opts: { center: [x, y, z], name: string }): Promise<string>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `opts.center` | `[number, number, number]` | yes | World point (same axes as `getCameraState().position`). |
| `opts.name` | `string` | yes | Stored as the `Name` property. |

## Returns

`string`: Id of the new object.

## What StreamBIM does

`store.createRecord("ifcObject", { center: [x, z, -y], properties: { Name, "@kind": "Annotation" } })` on the current building, then `save()`. The axis swap converts from widget (z-up) to the store's y-up coordinates. It is saved to the project for everyone: the test model shows existing `Annotation` objects in `valuesForObjectProperty("@kind")`.

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
