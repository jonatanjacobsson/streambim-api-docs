# gotoObject

**Status:** ✅ works · **Category:** Navigation · [All methods](../README.md)

Fly the camera to an object.

```ts
StreamBIM.API.gotoObject(guid: string): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `guid` | `string` | yes | IFC GlobalId (22 chars). |

## Returns

`true`: Resolves once the object info is fetched and the move is started.

## What StreamBIM does

Registered twice in the host; the second definition wins. It fetches object info, then `viewerController.send("gotoObject", info)`. It does **not** validate the GUID and has no `catch`, so an unknown GUID leaves the promise pending.

## Errors

- Unknown GUID: never settles (no rejection is wired up). Check with `getObjectInfo` first if the GUID may be stale.

## Examples

#### Go to the first door

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
return await StreamBIM.API.gotoObject(door);
```

<details open><summary>Output (verified 2026-11-01, 93 ms)</summary>

```json
true
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["048mvnhWPDHefuPHQ5uMBr"]` | resolved `boolean` | 7 |
