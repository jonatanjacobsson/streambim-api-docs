# showObject

**Status:** ✅ works · **Category:** Visibility & highlighting · [All methods](../README.md)

Unhide one object.

```ts
StreamBIM.API.showObject(guid: string): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `guid` | `string` | yes | 22-char GUID. |

## Returns

`true`: Also `true` if the object was not hidden.

## What StreamBIM does

Removes the GUID from `hiddenObjects`.

## Errors

- `{ code: "invalid" }` for a malformed GUID.

## Examples

#### Show a hidden object

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
await StreamBIM.API.hideObject(door);
await StreamBIM.API.showObject(door);
return (await StreamBIM.API.getViewportState()).hiddenObjects.includes(door);
```

<details open><summary>Output (verified 2026-11-01, 99 ms)</summary>

```json
false
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["048mvnhWPDHefuPHQ5uMBr"]` | resolved `boolean` | 1 |
