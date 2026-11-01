# gotoSpace

**Status:** ✅ works · **Category:** Navigation · [All methods](../README.md)

Put the camera at the centre of an IFC space.

```ts
StreamBIM.API.gotoSpace(guid: string): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `guid` | `string` | yes | GUID of an IfcSpace. |

## Returns

`true`: Camera position is set to the space centre (orientation kept).

## What StreamBIM does

Validates the GUID, fetches space info, sets `cameraState.position` to its `center`.

## Errors

- `{ code: "invalid" }` for a malformed GUID.
- `{ code: "notFound" | "unauthorized" | "notAllowed" | "unknown", debug }` from the space lookup.

## Examples

#### Jump into the first space

```js
const [space] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
if (!space) return 'model has no spaces';
await StreamBIM.API.gotoSpace(space);
return { space, inside: await StreamBIM.API.getSpaces() };
```

<details open><summary>Output (verified 2026-11-01, 183 ms)</summary>

```json
{
  "space": "0A0ainOlD3Dg0Lq_ZFZGQI",
  "inside": [
    "0A0ainOlD3Dg0Lq_ZFZGQI"
  ]
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["0A0ainOlD3Dg0Lq_ZFZGQI"]` | resolved `boolean` | 65 |
