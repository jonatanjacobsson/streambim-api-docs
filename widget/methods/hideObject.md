# hideObject

**Status:** ✅ works · **Category:** Visibility & highlighting · [All methods](../README.md)

Hide one object.

```ts
StreamBIM.API.hideObject(guid: string): Promise<boolean>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `guid` | `string` | yes | 22-char GUID. |

## Returns

`boolean`: `true` if it was hidden now, `false` if it was already hidden.

## What StreamBIM does

Adds `{ ifc: guid }` to `viewerController.hiddenObjects` (visible in `getViewportState().hiddenObjects`).

## Errors

- `{ code: "invalid" }` for a malformed GUID.

## Examples

#### Hide, hide again, show

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
const first = await StreamBIM.API.hideObject(door);
const second = await StreamBIM.API.hideObject(door);
await StreamBIM.API.showObject(door);
return { first, second };
```

<details open><summary>Output (verified 2026-11-01, 88 ms)</summary>

```json
{
  "first": true,
  "second": false
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["048mvnhWPDHefuPHQ5uMBr"]` | resolved `boolean` | 1 |
| already hidden | `["048mvnhWPDHefuPHQ5uMBr"]` | resolved `boolean` | 1 |
